import type {
    Announcement,
} from "./types";

// Announcement is editorial content — not on-chain.
export const activeAnnouncement: Announcement = {
    id: "announce-1",
    title: "Protocol Upgrade",
    content: "Protocol upgrade scheduled for block #49281. Expected downtime: 0s.",
    link: "/announcements/protocol-upgrade",
};
