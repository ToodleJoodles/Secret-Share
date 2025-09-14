// Import the specific function we need from the built-in crypto library
import { randomUUID } from 'crypto';

// A simple in-memory store for our secrets.
// NOTE: This memory is not guaranteed to persist between function calls on Vercel.
// This fits our "one-time" use case well, as secrets are short-lived.
const secrets = new Map();
const EXPIRATION_TIME_MS = 5 * 60 * 1000; // 5 minutes

export default function handler(request, response) {
    // This is the main entry point for the serverless function.
    // It routes the request to the correct function based on the HTTP method.
    if (request.method === 'POST') {
        return createSecret(request, response);
    }
    if (request.method === 'GET') {
        return getSecret(request, response);
    }
    
    // If the method is not POST or GET, return an error.
    return response.status(405).json({ message: 'Method Not Allowed' });
}

function createSecret(request, response) {
    const { secret } = request.body;

    if (!secret || typeof secret !== 'string' || secret.trim() === '') {
        return response.status(400).json({ message: 'Secret content is required.' });
    }

    // Generate a secure, random ID using the imported function
    const id = randomUUID();

    // Store the secret in our in-memory map
    secrets.set(id, secret);

    // Set a timer to automatically delete the secret after 5 minutes
    setTimeout(() => {
        if (secrets.has(id)) {
            secrets.delete(id);
            console.log(`Expired and deleted secret: ${id}`);
        }
    }, EXPIRATION_TIME_MS);
    
    // Send back the ID so the frontend can build the link
    return response.status(201).json({ id });
}

function getSecret(request, response) {
    // Vercel populates `request.query` with URL search parameters (e.g., ?id=...)
    const { id } = request.query;

    if (!id) {
        return response.status(400).json({ message: 'Secret ID is required.' });
    }

    if (secrets.has(id)) {
        const secret = secrets.get(id);
        
        // This is the core logic: retrieve it, then immediately delete it.
        secrets.delete(id);
        
        return response.status(200).json({ secret });
    } else {
        // If it's not in the map, it was either already viewed or never existed.
        return response.status(404).json({ message: 'Secret not found. It may have already been viewed.' });
    }
}
