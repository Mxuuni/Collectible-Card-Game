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
const getRandomPokemonCards = async (count: number): Promise<PokemonCard[]> => {
    try {
        const response = await axios.get(`https://api.pokemontcg.io/v2/cards`, {
            headers: {
                'X-Api-Key': POKEMON_API_KEY
            },
            params: {
                pageSize: count,
                orderBy: 'random'
            }
        });

        const cards = response.data.data.map((card: any) => ({
            id: card.id, // ID de la carte depuis l'API
            name: card.name, // Nom de la carte
            imageUrl: card.images?.large || '', // URL de l'image de grande taille
        }));

        return cards;
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
        const randomCards = await getRandomPokemonCards(cardCount);

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

    console.log('Déploiement terminé.');
};

export default deployer;
