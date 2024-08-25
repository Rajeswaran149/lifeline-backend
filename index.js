const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");

require('dotenv').config();

const app = express();
const port = 5000;

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(error => console.error('MongoDB connection error:', error));

const FamilyMemberSchema = new mongoose.Schema({
    name: String,
    phoneNumber: String,
    userId: String // Add userId field for filtering
});

const FamilyMember = mongoose.model('FamilyMember', FamilyMemberSchema);

app.post('/send-alert', async (req, res) => {
    const { message, location } = req.body;
    console.log(location)

    if (!message) {
        return res.status(400).json({ status: 'Error', error: 'Message is required' });
    }

    try {
        const familyMembers = await FamilyMember.find();
        const numbers = familyMembers.map(member => member.phoneNumber);

        const results = await Promise.all(numbers.map(number =>
            client.messages.create({
                body: `${message}\nhttps://www.google.com/maps?q=${location.latitude},${location.longitude}`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: number
            })
        ));

        console.log(results);
        res.json({ status: 'Messages sent', results });
    } catch (error) {
        console.error('Error sending messages:', error);
        res.status(500).json({ status: 'Error sending messages', error: error.message });
    }
});

app.post('/add-contact', async (req, res) => {
    const { name, phoneNumber, userId } = req.body;

    if (!name || !phoneNumber || !userId) {
        return res.status(400).json({ status: 'Error', error: 'Name, phone number, and user ID are required' });
    }

    try {
        const newContact = new FamilyMember({ name, phoneNumber, userId });
        await newContact.save();
        res.json({ status: 'Contact added successfully' });
    } catch (error) {
        console.error('Error adding contact:', error);
        res.status(500).json({ status: 'Error adding contact', error: error.message });
    }
});

app.get('/get-contacts', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ status: 'Error', error: 'User ID is required' });
    }

    try {
        const contacts = await FamilyMember.find({ userId });
        res.json({ contacts });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ status: 'Error fetching contacts', error: error.message });
    }
});


app.delete('/delete-contact/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ status: 'Error', error: 'Contact ID is required' });
    }

    try {
        // Delete the contact by ID
        const result = await FamilyMember.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).json({ status: 'Error', error: 'Contact not found' });
        }

        res.json({ status: 'Contact deleted successfully' });
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({ status: 'Error deleting contact', error: error.message });
    }
});


//chatbot

app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    console.log(message);

    try {
        // Define the async function to handle the model generation
        async function run() {
            const prompt = message;
            // Assuming model.generateContent returns a promise with a response object
            const result = await model.generateContent(prompt);
            // Wait for response text
            const response = await result.response;
            const text = await response.text(); // Await the text() method to get the content
            console.log(text);
            return text;
        }

        // Call the async function and get the text
        const text = await run(); // Await the run function call to get the text

        // Send the response text back to the client
        res.send(text);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error occurred while processing the request');
    }
});




// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});




app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
