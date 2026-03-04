// ===== MESSAGING SYSTEM CORE =====
// Firestore structure: messages/{threadId}/messages/{messageId}
// Thread metadata: messages/{threadId} (participants, type, lastMessage, etc.)

// Utility: Get or create a thread between two users (admin-agent, agent-student)
async function getOrCreateThread(userAId, userBId, type) {
    const db = firebase.firestore();
    let threadQuery = db.collection('messages')
        .where('participants', 'array-contains', userAId)
        .where('type', '==', type);
    const threads = await threadQuery.get();
    let thread = null;
    threads.forEach(doc => {
        if (doc.data().participants.includes(userBId)) {
            thread = { id: doc.id, ...doc.data() };
        }
    });
    if (thread) return thread;
    // Create new thread
    const newThread = {
        participants: [userAId, userBId],
        type,
        lastMessage: '',
        lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection('messages').add(newThread);
    return { id: docRef.id, ...newThread };
}

// Send a message in a thread
async function sendMessage(threadId, senderId, content) {
    const db = firebase.firestore();
    const message = {
        senderId,
        content,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        readBy: [senderId],
    };
    await db.collection('messages').doc(threadId).collection('messages').add(message);
    await db.collection('messages').doc(threadId).update({
        lastMessage: content,
        lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });
    // Create notifications for other participants in the thread
    try {
        const threadDoc = await db.collection('messages').doc(threadId).get();
        if (threadDoc.exists) {
            const thread = threadDoc.data();
            const recipients = (thread.participants || []).filter(p => p !== senderId);
            for (const r of recipients) {
                try {
                    if (window.Notifications) {
                        await window.Notifications.createNotification({
                            recipientId: r,
                            type: 'message',
                            title: 'New message',
                            content: content.length > 120 ? content.slice(0, 120) + '…' : content,
                            link: `/messages.html#${threadId}`,
                            data: { threadId },
                            icon: 'fas fa-envelope'
                        });
                    }
                } catch (e) { console.error('notify message error', e); }
            }
        }
    } catch (e) { console.error('sendMessage notification error', e); }
}

// Listen for messages in a thread (real-time)
function listenForMessages(threadId, callback) {
    return firebase.firestore()
        .collection('messages').doc(threadId).collection('messages')
        .orderBy('timestamp')
        .onSnapshot(snapshot => {
            const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(messages);
        });
}

// Mark all messages as read for a user
async function markMessagesRead(threadId, userId) {
    const db = firebase.firestore();
    const messagesRef = db.collection('messages').doc(threadId).collection('messages');
    const snapshot = await messagesRef.where('readBy', 'array-contains', userId).get();
    const batch = db.batch();
    snapshot.forEach(doc => {
        if (!doc.data().readBy.includes(userId)) {
            batch.update(doc.ref, { readBy: firebase.firestore.FieldValue.arrayUnion(userId) });
        }
    });
    await batch.commit();
}

// List threads for a user
function listenForThreads(userId, callback) {
    return firebase.firestore()
        .collection('messages')
        .where('participants', 'array-contains', userId)
        .orderBy('lastTimestamp', 'desc')
        .onSnapshot(snapshot => {
            const threads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(threads);
        });
}

// Export functions for use in dashboards
window.Messaging = {
    getOrCreateThread,
    sendMessage,
    listenForMessages,
    markMessagesRead,
    listenForThreads,
};
