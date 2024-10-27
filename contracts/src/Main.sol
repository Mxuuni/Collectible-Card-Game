// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "./TCGCollection.sol";

contract Main {
    TCGCollection public tcgCollection;
    address public owner;
    mapping(string => uint) private collectionNames;

    event CollectionRegistered(string name, uint collectionId);
    event CardMinted(address to, uint tokenId, uint collectionId, string tokenURI);
    event BoosterCreated(string boosterId);
    event BoosterClaimed(string boosterId, address owner);

    constructor() {
        tcgCollection = new TCGCollection();
        owner = msg.sender;
    }

    function setTCGCollection(address _tcgCollectionAddress) external {
        require(msg.sender == owner, "Only the owner can set the TCGCollection");
        tcgCollection = TCGCollection(_tcgCollectionAddress);
    }

    function registerNewCollection(string calldata _name, uint _cardCount) external {
        require(msg.sender == owner, "Only the owner can register a collection");
        tcgCollection.createCollection(_name, _cardCount);
        collectionNames[_name] = tcgCollection.nextCollectionId() - 1;
        emit CollectionRegistered(_name, collectionNames[_name]);
    }

    function mintCardToCollection(address to, uint collectionId, string calldata cardId, string calldata imageUrl, string calldata description) external {
        require(msg.sender == owner, "Only the owner can mint cards");
        tcgCollection.mintCard(to, collectionId, cardId, imageUrl, description);
        emit CardMinted(to, collectionId, collectionId, imageUrl);
    }

    function createBooster(string calldata boosterId, string[] calldata cardIds) external {
        require(msg.sender == owner, "Only the owner can create a booster");
        TCGCollection.Card[] memory cardsToInclude = new TCGCollection.Card[](cardIds.length);

        for (uint i = 0; i < cardIds.length; i++) {
            (string memory cardId, string memory imageUrl, string memory description, address cardOwner) = tcgCollection.getCardByStringId(cardIds[i]);
            cardsToInclude[i] = TCGCollection.Card({
                cardId: cardId,
                imageUrl: imageUrl,
                description: description,
                owner: cardOwner
            });
        }

        tcgCollection.createBooster(boosterId, cardsToInclude);
        emit BoosterCreated(boosterId);
    }

    function claimBooster(string calldata boosterId) external {
        tcgCollection.claimBooster(boosterId);
        emit BoosterClaimed(boosterId, msg.sender);
    }

    function getAllCollections() external view returns (string[] memory names, uint[] memory cardCounts) {
        uint length = tcgCollection.nextCollectionId();
        names = new string[](length);
        cardCounts = new uint[](length);

        for (uint i = 0; i < length; i++) {
            (names[i], cardCounts[i]) = tcgCollection.getCollectionById(i);
        }

        return (names, cardCounts);
    }

    function getCardsInCollection(uint collectionId) external view returns (TCGCollection.Card[] memory) {
        return tcgCollection.getCardsInCollection(collectionId);
    }

    function getBoosters() external view returns (string[] memory) {
        return tcgCollection.getBoosters(); // Utilisation de getBoosters pour récupérer les IDs
    }

    function getBoosterIds() external view returns (string[] memory) {
        uint count = tcgCollection.boosterCount(); // Récupérer le nombre total de boosters
        string[] memory boosterIds = new string[](count); // Créer un tableau pour stocker les IDs des boosters

        for (uint i = 0; i < count; i++) {
            boosterIds[i] = tcgCollection.getBoosterId(i); // Récupérer chaque ID de booster
        }

        return boosterIds; // Retourner le tableau des IDs des boosters
    }

    function getCardsInBooster(string calldata boosterId) external view returns (TCGCollection.Card[] memory) {
        return tcgCollection.getCardsInBooster(boosterId);
    }

    function getBoosterDetails(string calldata boosterId) external view returns (TCGCollection.Booster memory) {
        return tcgCollection.getBoosterDetails(boosterId);
    }
}
