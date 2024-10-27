// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TCGCollection is ERC721URIStorage {
    struct Card {
        string cardId;
        string imageUrl;
        string description;
        address owner;
    }

    struct Collection {
        string name;
        uint cardCount;
        uint[] cardIds;
    }

    struct Booster {
        string boosterId;
        Card[] cards;
        address owner;
    }

    // Mappings
    mapping(uint => Collection) public collections;
    mapping(uint => Card) public cards; // Mapping pour stocker les cartes mintées
    mapping(string => Booster) public boosters; // Mapping pour stocker les boosters
    mapping(string => Card) public cardsMapping; // Mapping pour récupérer les cartes par `cardId`

    // Variables de comptage
    uint public nextCollectionId;
    uint public nextCardId; // Variable pour garder une trace de l'ID de la prochaine carte
    string[] public boosterIds; // tableau pour garder la trace des IDs des boosters
    uint public boosterCount; // Compteur de boosters

    constructor() ERC721("TCG Cards", "TCGC") {
        nextCollectionId = 0;
        nextCardId = 0; // Initialisation de l'ID de la prochaine carte
        boosterCount = 0; // Initialisation du compteur de boosters
    }

    function createCollection(string calldata _name, uint _cardCount) external {
        collections[nextCollectionId] = Collection({
            name: _name,
            cardCount: _cardCount,
            cardIds: new uint[](_cardCount) // Initialise avec un tableau vide
        });
        nextCollectionId++;
    }

    function mintCard(
        address to,
        uint collectionId,
        string memory cardId,
        string memory imageUrl,
        string memory description
    ) public {
        require(collectionId < nextCollectionId, "Collection does not exist");

        // Minting the NFT (ERC721)
        _mint(to, nextCardId);
        _setTokenURI(nextCardId, imageUrl); // Set token URI to the image URL

        // Stocker les informations de la carte
        Card memory newCard = Card({
            cardId: cardId,
            imageUrl: imageUrl,
            description: description,
            owner: to
        });
        cards[nextCardId] = newCard;
        cardsMapping[cardId] = newCard; // Ajouter la carte au `cardsMapping` pour permettre la récupération par `cardId`

        collections[collectionId].cardIds.push(nextCardId);
        nextCardId++; // Incrémenter l'ID de la prochaine carte
    }

    function createBooster(string calldata boosterId, Card[] memory cardsToInclude) external {
        require(bytes(boosters[boosterId].boosterId).length == 0, "Booster already exists");

        Booster storage newBooster = boosters[boosterId];
        newBooster.boosterId = boosterId;
        newBooster.owner = address(0); // Initialement sans propriétaire

        // Vérification de la longueur de cardsToInclude
        require(cardsToInclude.length > 0, "No cards provided for booster");

        for (uint i = 0; i < cardsToInclude.length; i++) {
            newBooster.cards.push(cardsToInclude[i]);
        }

        boosterIds.push(boosterId);
        boosterCount++;
    }

    function claimBooster(string calldata boosterId) external {
        Booster storage booster = boosters[boosterId];
        require(booster.owner == address(0), "Booster already claimed");

        booster.owner = msg.sender; // Assigner l'owner au booster

        for (uint i = 0; i < booster.cards.length; i++) {
            Card storage card = booster.cards[i];
            card.owner = msg.sender; // Assigner le même owner à chaque carte dans le booster
            mintCard(msg.sender, 0, card.cardId, card.imageUrl, card.description);
        }
    }

    function getBoosterOwner(string calldata boosterId) external view returns (address) {
        Booster storage booster = boosters[boosterId];
        require(bytes(booster.boosterId).length != 0, "Booster does not exist"); // Vérification de l'existence du booster
        return booster.owner; // Retourne l'adresse du propriétaire
    }

    function getBoosterId(uint index) external view returns (string memory) {
        require(index < boosterIds.length, "Index out of bounds");
        return boosterIds[index];
    }

    function getCollectionById(uint _collectionId) external view returns (string memory, uint) {
        Collection memory collection = collections[_collectionId];
        return (collection.name, collection.cardCount);
    }

    function getCardsInCollection(uint collectionId) external view returns (Card[] memory) {
        require(collectionId < nextCollectionId, "Collection does not exist");

        // Récupérer le tableau d'IDs de carte pour la collection donnée
        uint[] memory cardIds = collections[collectionId].cardIds;
        Card[] memory cardsInCollection = new Card[](cardIds.length);

        for (uint i = 0; i < cardIds.length; i++) {
            cardsInCollection[i] = cards[cardIds[i]]; // Remplir le tableau avec les cartes correspondantes
        }

        return cardsInCollection;
    }

    function getCardsInBooster(string calldata boosterId) external view returns (Card[] memory) {
        return boosters[boosterId].cards; // Récupérer les cartes du booster
    }

    // Nouvelle fonction pour obtenir les détails d'un booster
    function getBoosterDetails(string calldata boosterId) external view returns (Booster memory) {
        Booster storage booster = boosters[boosterId];
        require(bytes(booster.boosterId).length != 0, "Booster does not exist"); // Vérification de l'existence du booster
        return booster; // Retourner l'objet Booster
    }

    function getCardByStringId(string memory cardId) public view returns (string memory, string memory, string memory, address) {
        Card storage card = cardsMapping[cardId]; // Assuming you have a mapping `cardsMapping` from `string` to `Card`
        return (card.cardId, card.imageUrl, card.description, card.owner);
    }
    function getBoosters() external view returns (string[] memory) {
        return boosterIds; // Retourne le tableau des IDs des boosters
    }
}
