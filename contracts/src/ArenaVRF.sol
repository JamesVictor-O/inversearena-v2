// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

abstract contract ArenaVRF is Ownable2Step {
  
    struct Commitment {
        bytes32 commitHash; 
        uint256 blockNumber; 
        bool    revealed;
    }

  
    mapping(uint256 => mapping(uint32 => Commitment)) private _commitments;
    mapping(address => bool) public isResolver;

    event Committed(uint256 indexed poolId, uint32 indexed round, bytes32 commitHash);
    event Revealed(uint256 indexed poolId, uint32 indexed round, uint256 randomValue);
    event ResolverUpdated(address indexed resolver, bool enabled);

  
    error NotResolver();
    error AlreadyCommitted();
    error NotCommitted();
    error AlreadyRevealed();
    error InvalidReveal();
    error TooEarlyToReveal(); 

    constructor(address initialOwner) Ownable(initialOwner) {
        isResolver[initialOwner] = true;
    }

    modifier onlyResolver() {
        if (!isResolver[msg.sender]) revert NotResolver();
        _;
    }

   

    function setResolver(address resolver, bool enabled) external onlyOwner {
        isResolver[resolver] = enabled;
        emit ResolverUpdated(resolver, enabled);
    }

    function commit(uint256 poolId, uint32 round, bytes32 hash) external onlyResolver {
        Commitment storage c = _commitments[poolId][round];
        if (c.commitHash != bytes32(0)) revert AlreadyCommitted();
        c.commitHash = hash;
        c.blockNumber = block.number;
        emit Committed(poolId, round, hash);
    }


    function reveal(
        uint256 poolId,
        uint32  round,
        bytes32 secret
    ) external onlyResolver returns (uint256 randomValue) {
        Commitment storage c = _commitments[poolId][round];
        if (c.commitHash == bytes32(0)) revert NotCommitted();
        if (c.revealed) revert AlreadyRevealed();
        if (block.number <= c.blockNumber) revert TooEarlyToReveal();

        bytes32 expected = keccak256(abi.encodePacked(secret, poolId, round));
        if (expected != c.commitHash) revert InvalidReveal();

        c.revealed = true;

        randomValue = uint256(
            keccak256(abi.encodePacked(secret, blockhash(block.number - 1), poolId, round))
        );

        emit Revealed(poolId, round, randomValue);
        return randomValue;
    }
    
    function getCommitment(uint256 poolId, uint32 round)
        external
        view
        returns (bytes32 commitHash, uint256 blockNumber, bool revealed)
    {
        Commitment storage c = _commitments[poolId][round];
        return (c.commitHash, c.blockNumber, c.revealed);
    }

    function isCommitted(uint256 poolId, uint32 round) external view returns (bool) {
        return _commitments[poolId][round].commitHash != bytes32(0);
    }
}
