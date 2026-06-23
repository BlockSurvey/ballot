import { v4 as uuidv4 } from "uuid";
import { Constants } from "../common/constants";
import {
    getFileFromGaia, getGaiaAddressFromPublicKey, getMyStxAddress, getUserData, putFileToGaia
} from "./auth";

const GROUP_INDEX_FILE = "groupIndex.json";

/** Storage filename for a single group's metadata. */
export function groupFileName(groupId) {
    return `group-${groupId}.json`;
}

/** Public, cross-user shareable link for a group. Uses the current origin so the
 *  link works in whatever environment it was created in (localhost in dev,
 *  ballot.gg in production). */
export function getGroupPublicUrl(groupId, gaiaAddress) {
    const origin = (typeof window !== "undefined" && window.location?.origin) || "https://ballot.gg";
    return `${origin}/group/${groupId}/${gaiaAddress}`;
}

/**
 * Read the connected user's group index ({ list, ref }). Returns an empty index
 * if the file does not exist yet.
 */
export async function getGroupIndex() {
    try {
        const response = await getFileFromGaia(GROUP_INDEX_FILE, {});
        const parsed = JSON.parse(response);
        if (parsed && Array.isArray(parsed.list) && parsed.ref) {
            return parsed;
        }
        return { list: [], ref: {} };
    } catch (error) {
        // does_not_exist is the sentinel used across the app for a missing file
        if (error && error.code === "does_not_exist") {
            return { list: [], ref: {} };
        }
        throw error;
    }
}

/** Upsert a group summary into the index and persist it. */
async function upsertGroupIndex(groupObject) {
    const index = await getGroupIndex();

    if (!index.list.includes(groupObject.id)) {
        index.list.push(groupObject.id);
    }
    index.ref[groupObject.id] = {
        id: groupObject.id,
        title: groupObject.title,
        status: groupObject.status,
        pollCount: groupObject.polls.length,
        createdAt: groupObject.createdAt,
        updatedAt: new Date().toISOString(),
    };

    await putFileToGaia(GROUP_INDEX_FILE, JSON.stringify(index), {});
    return index;
}

/**
 * Create a grouped poll. Writes group-{id}.json publicly (so respondents can read it
 * cross-user) and updates the per-user groupIndex.json.
 *
 * @param {{ title: string, description?: string, polls: Array<{ pollId: string, gaiaAddress?: string, title?: string }> }} input
 * @returns {Promise<{ group: object, url: string }>}
 */
export async function createGroup({ title, description = "", polls }) {
    if (!title || !title.trim()) {
        throw new Error("A group title is required");
    }
    if (!Array.isArray(polls) || polls.length === 0) {
        throw new Error("Select at least one poll to group");
    }

    const creatorGaiaAddress = await getGaiaAddressFromPublicKey();

    const groupObject = {
        id: uuidv4(),
        title: title.trim(),
        description: description || "",
        creatorGaiaAddress,
        polls: polls.map((p, order) => ({
            pollId: p.pollId,
            gaiaAddress: p.gaiaAddress || creatorGaiaAddress,
            title: p.title || "",
            order,
        })),
        status: "live",
        createdAt: new Date().toISOString(),
        username: getUserData()?.identityAddress,
        userStxAddress: getMyStxAddress(),
    };

    // Public (unencrypted) so the group link is readable by any respondent.
    await putFileToGaia(groupFileName(groupObject.id), JSON.stringify(groupObject), { encrypt: false });
    await upsertGroupIndex(groupObject);

    return { group: groupObject, url: getGroupPublicUrl(groupObject.id, creatorGaiaAddress) };
}

/** Read the connected user's own group file (full metadata, incl. polls). */
export async function getOwnGroup(id) {
    try {
        const res = await getFileFromGaia(groupFileName(id), {});
        return JSON.parse(res);
    } catch (error) {
        return null;
    }
}

/** Own creator gaia address (used to build share links for the groups list). */
export async function getOwnGaiaAddress() {
    return getGaiaAddressFromPublicKey();
}

/**
 * Update an existing group (title / description / polls / order), preserving its
 * id, createdAt and creator. Rewrites group-{id}.json and the index.
 */
export async function updateGroup({ id, title, description = "", polls }) {
    if (!title || !title.trim()) throw new Error("A group title is required");
    if (!Array.isArray(polls) || polls.length === 0) throw new Error("Select at least one poll to group");

    const creatorGaiaAddress = await getGaiaAddressFromPublicKey();
    const existing = await getOwnGroup(id);

    const groupObject = {
        ...(existing || {}),
        id,
        title: title.trim(),
        description: description || "",
        creatorGaiaAddress,
        polls: polls.map((p, order) => ({
            pollId: p.pollId,
            gaiaAddress: p.gaiaAddress || creatorGaiaAddress,
            title: p.title || "",
            order,
        })),
        status: existing?.status || "live",
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        username: getUserData()?.identityAddress,
        userStxAddress: getMyStxAddress(),
    };

    await putFileToGaia(groupFileName(id), JSON.stringify(groupObject), { encrypt: false });
    await upsertGroupIndex(groupObject);
    return { group: groupObject, url: getGroupPublicUrl(id, creatorGaiaAddress) };
}

/**
 * Fetch a group's public metadata by id + creator gaia address. Works without auth
 * (used both client-side and from getServerSideProps).
 */
export async function fetchGroup(groupId, gaiaAddress) {
    const url = `${Constants.GAIA_HUB_PREFIX}${gaiaAddress}/${groupFileName(groupId)}`;
    const response = await fetch(url);
    if (!response.ok) {
        return null;
    }
    return response.json();
}

/** Remove a group from the index (the underlying file delete is a storage no-op). */
export async function deleteGroup(groupId) {
    const index = await getGroupIndex();
    index.list = index.list.filter((id) => id !== groupId);
    delete index.ref[groupId];
    await putFileToGaia(GROUP_INDEX_FILE, JSON.stringify(index), {});
    return index;
}
