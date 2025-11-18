
const express = require('express');
const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
const db = admin.firestore();

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Get all collections
app.get('/collections', async (req, res) => {
  try {
    const collections = await db.listCollections();
    const collectionIds = collections.map(col => col.id);
    res.json(collectionIds);
  } catch (error) {
    console.error('Error getting collections:', error);
    res.status(500).json({ error: 'Failed to get collections' });
  }
});

// Get documents from a specific collection
app.get('/collections/:id', async (req, res) => {
  try {
    const collectionId = req.params.id;
    const snapshot = await db.collection(collectionId).get();
    const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(documents);
  } catch (error) {
    console.error('Error getting collection documents:', error);
    res.status(500).json({ error: 'Failed to get collection documents' });
  }
});

// Get all documents from jactoUsers collection
app.get('/jacto-users', async (req, res) => {
  try {
    const snapshot = await db.collection('jactoUsers').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (error) {
    console.error('Error getting jactoUsers:', error);
    res.status(500).json({ error: 'Failed to get jactoUsers collection' });
  }
});

// Get single jactoUser document
app.get('/jacto-users/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    if (!docId) {
      return res.status(400).json({ error: 'Missing user id' });
    }

    const doc = await db.collection('jactoUsers').doc(docId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error(`Error getting jactoUser ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update jactoUser document
app.put('/jacto-users/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    const userData = req.body;

    if (!docId) {
      return res.status(400).json({ error: 'Missing user id' });
    }

    if (!userData || Object.keys(userData).length === 0) {
      return res.status(400).json({ error: 'Missing user data' });
    }

    const payload = {
      ...userData,
      id: docId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('jactoUsers').doc(docId).set(payload, { merge: true });
    const updatedDoc = await db.collection('jactoUsers').doc(docId).get();

    res.json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() }
    });
  } catch (error) {
    console.error(`Error updating jactoUser ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete jactoUser document
app.delete('/jacto-users/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    if (!docId) {
      return res.status(400).json({ error: 'Missing user id' });
    }

    await db.collection('jactoUsers').doc(docId).delete();

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error(`Error deleting jactoUser ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to view the application`);
});

module.exports = app;
