const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

// Clé d'API pour l'API Pokémon TCG
const POKEMON_API_KEY = '5dd7ba84-4736-4dea-a9bd-996da8ac1f6e';

// Fonction pour récupérer des informations sur une carte Pokémon
const getPokemonCard = async (cardId) => {
    try {
        const response = await axios.get(`https://api.pokemontcg.io/v2/cards/${cardId}`, {
            headers: {
                'X-Api-Key': POKEMON_API_KEY
            }
        });
        return response.data.data; // Assure-toi que la réponse est bien structurée ainsi
    } catch (error) {
        console.error(`Erreur lors de la récupération de la carte Pokémon ${cardId}:`, error.message || error);
        throw error; // Lance l'erreur pour une meilleure gestion côté route
    }
};

// Middleware pour gérer les erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Une erreur est survenue sur le serveur.' });
});

// Route pour récupérer les informations d'une carte Pokémon
app.get('/card/:id', async (req, res) => {
    const cardId = req.params.id;
    try {
        const cardData = await getPokemonCard(cardId);
        if (!cardData) {
            return res.status(404).json({ error: `Carte Pokémon avec l'ID ${cardId} non trouvée.` });
        }

        // Structure des métadonnées du NFT
        const metadata = {
            name: cardData.name,
            description: `Carte Pokémon - ${cardData.name}`,
            image: cardData.images.large, // Assure-toi que 'images.large' existe dans l'API
            attributes: [
                { trait_type: 'HP', value: cardData.hp || 'Inconnu' }, // Vérifie si HP est défini
                { trait_type: 'Type', value: cardData.types ? cardData.types.join(', ') : 'Inconnu' }
            ]
        };

        res.json(metadata); // Retourne les métadonnées en JSON
    } catch (error) {
        // En cas d'erreur d'API ou autre, renvoie un message d'erreur clair
        res.status(500).json({ error: 'Impossible de récupérer les informations de la carte.' });
    }
});

// Lance le serveur sur le port spécifié
app.listen(port, () => {
    console.log(`Backend actif sur http://localhost:${port}`);
});
