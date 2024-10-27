import { ethers } from 'ethers';
import * as ethereum from './ethereum';
import { contracts } from '@/contracts.json';

// Définir le type pour le contrat Main
export type Card = {
    cardId: string;
    imageUrl: string;
    description: string;
    owner: string;
};

export type Booster = {
    boosterId: string;
    cards: Card[];
    owner: string;
};

// Mettre à jour le type pour le contrat Main
export type Main = {
    registerNewCollection: (name: string, cardCount: number) => Promise<ethers.ContractTransaction>;
    getCollectionInfo: (collectionId: number) => Promise<[string, number]>;
    mintCard: (to: string, collectionId: number, tokenURI: string) => Promise<ethers.ContractTransaction>;
    getAllCollections: () => Promise<{ names: string[]; cardCounts: number[] }>;
    getCardsInCollection: (collectionId: number) => Promise<Card[]>; // Typage mis à jour
    getBoosters: () => Promise<string[]>; // Assurez-vous que cette fonction existe dans le contrat
    getCardsInBooster: (boosterId: string) => Promise<Card[]>; // Typage mis à jour
    claimBooster: (boosterId: string) => Promise<ethers.ContractTransaction>;
    getBoosterDetails: (boosterId: string) => Promise<Booster>; // Typage mis à jour
    getBoosterIds: () => Promise<string[]>; // Ajoutez cette ligne
};

export const correctChain = () => {
    return 31337; // ID de la chaîne HardHat
};

export const init = async (details: ethereum.Details) => {
    const { provider, signer } = details;
    const network = await provider.getNetwork();

    if (correctChain() !== network.chainId) {
        console.error('Please switch to HardHat');
        return null;
    }

    const { address, abi } = contracts.Main;
    const contract = new ethers.Contract(address, abi, provider);
    const deployed = await contract.deployed();

    if (!deployed) return null;

    // Convertir en unknown avant de forcer le type Main
    const contract_ = signer ? contract.connect(signer) : contract;
    return contract_ as unknown as Main; // Cast to unknown first, then to Main
};

export const myShip = () => contracts.Main.address;
