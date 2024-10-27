import { useEffect, useMemo, useState } from 'react';
import { ethers } from "ethers";

import styles from './styles.module.css';
import * as ethereum from '@/lib/ethereum';
import * as main from '@/lib/main';
import Card from './Card';
import pokemonImage from './pokemon.png';
import boosterImage from './card.png';

interface Card {
    id: string;
    title: string;
    image: string;
}

interface Booster {
    boosterId: string; // Identifiant du booster
    cards: Card[];     // Tableau d'objets Card
    owner: string;     // Adresse du propriétaire
}

interface Collection {
    id: number;
    name: string;
    cardCount: string;
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
    const [collections, setCollections] = useState<Collection[]>([]);
    const [collectionsLoaded, setCollectionsLoaded] = useState(false); // Drapeau pour éviter le rechargement
    const [cards, setCards] = useState<{ [key: number]: Card[] }>({});
    const [boosters, setBoosters] = useState<Booster[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
    const [selectedBooster, setSelectedBooster] = useState<Booster | null>(null);
    const [showBoosters, setShowBoosters] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCollections = async () => {
        if (!wallet?.contract) {
            console.log("Le contrat n'est pas disponible");
            return;
        }

        try {
            const { names, cardCounts } = await wallet.contract.getAllCollections();
            const fetchedCollections: Collection[] = names.map((name: string, index: number) => ({
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
                                    image: cardData.imageUrl,
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

    const fetchBoosters = async () => {
        try {
            if (!wallet?.contract) {
                console.error("Le contrat n'est pas disponible");
                return;
            }

            const boosterIdsRaw: string[] = await wallet.contract.getBoosters();
            const fetchedBoosters = await Promise.all(
                boosterIdsRaw.map(async (boosterId) => {
                    const boosterDetails = await wallet.contract.getBoosterDetails(boosterId);

                    if (!boosterDetails.cards) {
                        console.warn(`Aucune carte trouvée pour le booster ${boosterId}`);
                        return null;
                    }

                    const formattedCards: Card[] = boosterDetails.cards.map((card) => ({
                        id: card.cardId,
                        title: card.description,
                        image: card.imageUrl,
                    }));

                    return {
                        boosterId: boosterDetails.boosterId,
                        cards: formattedCards,
                        owner: boosterDetails.owner,
                    };
                })
            );

            // Filtrer les valeurs nulles et mettre à jour l'état des boosters
            setBoosters(fetchedBoosters.filter((booster): booster is Booster => booster !== null));
        } catch (error) {
            console.error("Erreur lors de la récupération des boosters:", error);
        }
    };

    useEffect(() => {
        if (wallet) {
            fetchCollections();
            fetchBoosters();
        }
    }, [wallet]);

    const claimBooster = async (boosterId: string) => {
        if (!wallet?.contract) {
            console.log("Le contrat n'est pas disponible");
            return;
        }
    
        try {
            // Vérifiez si le booster est déjà réclamé
            const boosterDetailsBefore = await wallet.contract.getBoosterDetails(boosterId);
    
            if (boosterDetailsBefore.owner !== ethers.constants.AddressZero) {
                console.log(`Le booster ${boosterId} a déjà été réclamé par ${boosterDetailsBefore.owner}`);
                alert("Ce booster a déjà été réclamé.");
                return;
            }
    
            // Tentez de réclamer le booster
            const tx = await wallet.contract.claimBooster(boosterId);
            console.log("Transaction envoyée:", tx);
    
            const receipt = await tx.wait();
            if (receipt.status !== 1) {
                console.error("La transaction a échoué:", receipt);
                alert("Erreur lors de la réclamation du booster. Veuillez réessayer.");
                return;
            }
    
            // Récupérez les détails du booster après la réclamation
            const boosterDetailsAfter = await wallet.contract.getBoosterDetails(boosterId);
            console.log("Détails après réclamation:", boosterDetailsAfter);
    
            const claimedBooster: Booster = {
                boosterId,
                cards: boosterDetailsAfter.cards.map((cardData) => ({
                    id: cardData.cardId,
                    title: cardData.description,
                    image: cardData.imageUrl,
                })),
                owner: boosterDetailsAfter.owner,
            };
    
            // Met à jour l'état de l'application
            setBoosters((prevBoosters) =>
                prevBoosters.map((booster) =>
                    booster.boosterId === boosterId ? claimedBooster : booster
                )
            );
            setSelectedBooster(claimedBooster);
        } catch (error: any) {
            console.error("Erreur lors de la réclamation du booster:", error);
    
            // Affichage de messages d'erreur basés sur la nature de l'erreur
            if (error.reason) {
                alert(`Erreur lors de la réclamation du booster: ${error.reason}`);
            } else if (error.message && error.message.includes("cannot estimate gas")) {
                alert("Erreur : Impossible d'estimer le gaz. La carte est peut-être déjà possédée ou la transaction est invalide.");
            } else {
                alert("Une erreur inconnue est survenue.");
            }
        }
    };
    
    

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <img src={pokemonImage} alt="Pokémon Header" />
            </header>

            <aside className={styles.sidebar}>
                <h2>Menu</h2>
                <button onClick={() => setShowBoosters(false)} className={!showBoosters ? styles.activeButton : ''}>
                    Collections
                </button>
                <button onClick={() => setShowBoosters(true)} className={showBoosters ? styles.activeButton : ''}>
                    Boosters
                </button>
                <div className={styles.collectionList}>
                    {!showBoosters ? (
                        collections.map((collection) => (
                            <div
                                key={collection.id}
                                className={`${styles.collectionItem} ${selectedCollectionId === collection.id ? styles.active : ''}`}
                                onClick={() => setSelectedCollectionId(collection.id)}
                            >
                                {collection.name} <span className={styles.badge}>{collection.cardCount}</span>
                            </div>
                        ))
                    ) : null}
                </div>
            </aside>
            
            <main className={styles.mainContent}>
                {selectedCollectionId !== null && !showBoosters && (
                    <div>
                        <h3>Cartes dans {collections[selectedCollectionId].name}</h3>
                        <div className={styles.cardGrid}>
                            {cards[selectedCollectionId]?.map((card) => (
                                <Card key={card.id} title={card.title} image={card.image} />
                            ))}
                        </div>
                    </div>
                )}

                {showBoosters && (
                    <div>
                        <h3>Boosters</h3>
                        <div className={styles.boosterList}>
                            {boosters.map((booster) => (
                                <div key={booster.boosterId} className={styles.boosterItem}>
                                    <img
                                        src={boosterImage}
                                        alt={`Booster ${booster.boosterId}`}
                                        className={styles.boosterImage}
                                    />
                                    <div className={styles.boosterInfo}>
                                        <h4 className={styles.boosterTitle}>Booster N° {booster.boosterId}</h4>
                                        <p className={styles.boosterOwner}>Owned by: {booster.owner}</p>
                                        <button
                                            className={styles.claimButton}
                                            onClick={() => claimBooster(booster.boosterId)}
                                        >
                                            Réclamer
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
