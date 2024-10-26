import { useEffect, useMemo, useState } from 'react';
import styles from './styles.module.css';
import * as ethereum from '@/lib/ethereum';
import * as main from '@/lib/main';
import Card from './Card';
import pokemonImage from './pokemon.png'; // Import the Pokémon image
interface Card {
    id: string;
    title: string;
    image: string;
}

const useWallet = () => {
    const [details, setDetails] = useState<ethereum.Details>();
    const [contract, setContract] = useState<main.Main>();

    useEffect(() => {
        const connectWallet = async () => {
            try {
                const details_ = await ethereum.connect('metamask');
                if (!details_) {
                    console.error('Erreur de connexion à MetaMask');
                    return;
                }
                setDetails(details_);
                const contract_ = await main.init(details_);
                if (!contract_) {
                    console.error("Erreur lors de l'initialisation du contrat");
                    return;
                }
                setContract(contract_);
            } catch (error) {
                console.warn('Erreur non gérée', error);
            }
        };
        connectWallet();
    }, []);

    return useMemo(() => {
        if (!details || !contract) return;
        return { details, contract };
    }, [details, contract]);
};

export const App = () => {
    const wallet = useWallet();
    const [collections, setCollections] = useState<any[]>([]);
    const [cards, setCards] = useState<{ [key: number]: Card[] }>({});
    const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);

    useEffect(() => {
        const fetchCollections = async () => {
            if (!wallet?.contract) {
                console.log("Le contrat n'est pas disponible");
                return;
            }

            try {
                const { names, cardCounts } = await wallet.contract.getAllCollections();
                const fetchedCollections = names.map((name: string, index: number) => ({
                    id: index,
                    name,
                    cardCount: cardCounts[index].toString(),
                }));

                setCollections(fetchedCollections);

                const fetchedCards = await Promise.all(
                    fetchedCollections.map(async (collection) => {
                        try {
                            const cardsInCollectionRaw = await wallet.contract.getCardsInCollection(collection.id);
                            const uniqueCards = new Set<string>();
                            const cardsInCollection: Card[] = [];

                            for (const cardData of cardsInCollectionRaw) {
                                if (!uniqueCards.has(cardData.cardId)) {
                                    uniqueCards.add(cardData.cardId);
                                    cardsInCollection.push({
                                        id: cardData.cardId,
                                        title: cardData.description,
                                        image: cardData.imageUrl
                                    });
                                }
                            }

                            return { id: collection.id, cards: cardsInCollection };
                        } catch (error) {
                            console.error(`Erreur lors de la récupération des cartes pour la collection ${collection.id}:`, error);
                            return { id: collection.id, cards: [] };
                        }
                    })
                );

                const cardsByCollection = fetchedCards.reduce((acc, { id, cards }) => {
                    acc[id] = cards;
                    return acc;
                }, {} as { [key: number]: Card[] });

                setCards(cardsByCollection);
            } catch (error) {
                console.error("Erreur lors de la récupération des collections:", error);
            }
        };

        fetchCollections();
    }, [wallet]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <img src={pokemonImage} alt="Pokémon Header" />
             
            </header>
            <div className={styles.sidebar}>
                <h4>Mes Collections</h4>
                <div className={styles.collectionList}>
                    {collections.map((collection) => (
                        <div 
                            key={collection.id}
                            className={`${styles.collectionItem} ${selectedCollectionId === collection.id ? styles.active : ''}`}
                            onClick={() => setSelectedCollectionId(collection.id)}
                        >
                            {collection.name} <span className={styles.badge}>{collection.cardCount}</span>
                        </div>
                    ))}
                </div>
            </div>

            <main className={styles.mainContent}>
                <h1>Cartes de la Collection</h1>
                {selectedCollectionId !== null ? (
                    <div className={styles.cardGridContent}>
                        <h2>Cartes dans {collections[selectedCollectionId].name}</h2>
                        {cards[selectedCollectionId]?.length > 0 ? (
                            <div className={styles.cardGrid}>
                                {cards[selectedCollectionId].map((card: Card) => (
                                    <Card key={card.id} title={card.title} image={card.image} />
                                ))}
                            </div>
                        ) : (
                            <p>Aucune carte dans cette collection.</p>
                        )}
                    </div>
                ) : (
                    <p>Sélectionnez une collection pour voir les cartes.</p>
                )}
            </main>
        </div>
    );
};

