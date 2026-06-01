const keyFor = (userId) => `attendio.profile-activity.${userId || "anonymous"}`;

export const readProfileActivity = (userId) => {
    try {
        return JSON.parse(localStorage.getItem(keyFor(userId)) || "[]");
    } catch {
        return [];
    }
};

export const recordProfileActivity = (userId, action, detail) => {
    const next = [
        { id: crypto.randomUUID(), action, detail, created_at: new Date().toISOString() },
        ...readProfileActivity(userId),
    ].slice(0, 100);
    localStorage.setItem(keyFor(userId), JSON.stringify(next));
    return next;
};

export const deleteProfileActivity = (userId, activityId) => {
    const next = readProfileActivity(userId).filter((item) => item.id !== activityId);
    localStorage.setItem(keyFor(userId), JSON.stringify(next));
    return next;
};

export const clearProfileActivity = (userId) => {
    localStorage.setItem(keyFor(userId), "[]");
    return [];
};
