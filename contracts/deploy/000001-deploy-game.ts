import 'dotenv/config';
import { DeployFunction } from 'hardhat-deploy/types';
import axios from 'axios';

const POKEMON_API_KEY = '5dd7ba84-4736-4dea-a9bd-996da8ac1f6e';

interface PokemonCard {
    id: string;
    name: string;
    imageUrl: string;
}

// Fonction pour obtenir des cartes Pokémon aléatoires
const getRandomPokemonCards = async (count: number, usedCardIds: Set<string>): Promise<PokemonCard[]> => {
    try {
        const response = await axios.get(`https://api.pokemontcg.io/v2/cards`, {
            headers: {
                'X-Api-Key': POKEMON_API_KEY
            },
            params: {
                pageSize: count * 2, // Pour avoir une chance d'obtenir assez de cartes uniques
                orderBy: 'random'
            }
        });

        const cards: PokemonCard[] = response.data.data.map((card: any) => ({
            id: card.id,
            name: card.name,
            imageUrl: card.images?.large || '',
        }));

        // Filtrer les cartes pour éviter les doublons
        const uniqueCards = cards.filter(card => !usedCardIds.has(card.id)).slice(0, count);
        
        // Ajouter les IDs des cartes utilisées à l'ensemble
        uniqueCards.forEach(card => usedCardIds.add(card.id));

        return uniqueCards;
    } catch (error) {
        console.error("Erreur lors de la récupération des cartes Pokémon:", error);
        throw error;
    }
};

const deployer: DeployFunction = async hre => {
    const { deployer } = await hre.getNamedAccounts();
    const { deployments, ethers } = hre;

    console.log('Déploiement du contrat Main...');
    const mainDeployment = await deployments.deploy('Main', { from: deployer, log: true });
    const mainContract = await ethers.getContractAt('Main', mainDeployment.address);

    console.log('Contrat Main déployé à:', mainDeployment.address);

    console.log('Déploiement du contrat TCGCollection...');
    const tcgCollectionDeployment = await deployments.deploy('TCGCollection', { from: deployer, log: true });
    const tcgCollectionContract = await ethers.getContractAt('TCGCollection', tcgCollectionDeployment.address);

    console.log('Contrat TCGCollection déployé à:', tcgCollectionDeployment.address);

    await mainContract.setTCGCollection(tcgCollectionDeployment.address);
    console.log('TCGCollection est lié au contrat Main.');

    // Définir les collections à créer
    const collections = [
        { name: 'Collection 1', cardCount: 5 },
        { name: 'Collection 2', cardCount: 10 },
        { name: 'Collection 3', cardCount: 12 },
    ];

    // Boucle à travers chaque collection
    for (const collection of collections) {
        const { name, cardCount } = collection;

        // Obtenir des cartes Pokémon aléatoires
        const randomCards = await getRandomPokemonCards(cardCount, new Set());

        // Créer la collection sur la blockchain
        const createCollectionTx = await mainContract.registerNewCollection(name, cardCount);
        await createCollectionTx.wait();
        console.log(`Collection ${name} créée avec succès !`);

        // Mint chaque carte dans la collection sur la blockchain
        for (const card of randomCards) {
            const cardId = card.id;
            const description = card.name; // Utilisez le nom comme description pour la carte
            const imageUrl = card.imageUrl;

            console.log(`Minting card ${cardId} - ${description} into the collection ${name}...`);
            const mintCardTx = await mainContract.mintCardToCollection(deployer, collections.indexOf(collection), cardId, imageUrl, description);
            await mintCardTx.wait();
            console.log(`Carte ${cardId} (${description}) mintée avec succès dans la collection ${name} !`);
        }
    }

 // Créer 4 boosters avec 5 cartes chacun
const boosterCount = 3; // Nombre de boosters à créer
const boosterCardCount = 5; // Nombre de cartes dans chaque booster
const usedCardIds = new Set<string>(); // Ensemble pour suivre les IDs de cartes déjà utilisées

// Récupérer des cartes suffisantes avant de créer les boosters
const totalCardsNeeded = boosterCount * boosterCardCount;
const randomCards = await getRandomPokemonCards(totalCardsNeeded, usedCardIds);

for (let i = 1; i < boosterCount; i++) {
    // Sélectionner les cartes pour le booster
    const boosterCards = randomCards.slice(i * boosterCardCount, (i + 1) * boosterCardCount);
    
    // Vérifier si suffisamment de cartes ont été récupérées
    if (boosterCards.length < boosterCardCount) {
        console.error(`Aucune carte suffisante à inclure pour le booster ${i}`);
        continue; // Passer au prochain booster si pas assez de cartes
    }
    
    // Enregistrer le booster dans le contrat avec ID et owner null
    const boosterId = i.toString(); // Utiliser l'index `i` comme ID du booster
    const boosterName = `Booster ${boosterId}`; // Nommer le booster
    const owner = ethers.constants.AddressZero; // Owner null (adresse zéro)

    const boosterTx = await mainContract.createBooster(boosterId, boosterCards);
    await boosterTx.wait();
    console.log(`Booster ${boosterName} créé avec les cartes : ${boosterCards.map(card => card.id).join(', ')}`);
}

console.log('Déploiement terminé.');



};

export default deployer;
