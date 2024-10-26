// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "./TCGCollection.sol";

contract Main {
    TCGCollection public tcgCollection;
    address public owner;
    mapping(string => uint) private collectionNames;

    event CollectionRegistered(string name, uint collectionId);
    event CardMinted(address to, uint tokenId, uint collectionId, string tokenURI);

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

    function getAllCollections() external view returns (string[] memory names, uint[] memory cardCounts) {
        uint length = tcgCollection.nextCollectionId();
        names = new string[](length);
        cardCounts = new uint[](length);

        for (uint i = 0; i < length; i++) {
            (names[i], cardCounts[i]) = tcgCollection.getCollectionById(i);
        }

        return (names, cardCounts);
    }

    // Fonction pour récupérer les cartes d'une collection
    function getCardsInCollection(uint collectionId) external view returns (TCGCollection.Card[] memory) {
        return tcgCollection.getCardsInCollection(collectionId);
    }
}
