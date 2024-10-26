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

    mapping(uint => Collection) public collections;
    mapping(uint => Card) public cards; // Ajout d'un mapping pour stocker les cartes mintées
    uint public nextCollectionId;
    uint public nextCardId; // Variable pour garder une trace de l'ID de la prochaine carte

    constructor() ERC721("TCG Cards", "TCGC") {
        nextCollectionId = 0;
        nextCardId = 0; // Initialisation de l'ID de la prochaine carte
    }

    function createCollection(string calldata _name, uint _cardCount) external {
        collections[nextCollectionId] = Collection({
            name: _name,
            cardCount: _cardCount,
            cardIds: new uint [] (_cardCount)  // Initialise avec un tableau vide
        });
        nextCollectionId++;
    }

    function mintCard(address to, uint collectionId, string calldata cardId, string calldata imageUrl, string calldata description) external {
        require(collectionId < nextCollectionId, "Collection does not exist");

        // Minting the NFT (ERC721)
        _mint(to, nextCardId);
        _setTokenURI(nextCardId, imageUrl); // Set token URI to the image URL

        // Stocker les informations de la carte
        cards[nextCardId] = Card({
            cardId: cardId,
            imageUrl: imageUrl,
            description: description,
            owner: to
        });

        // Utiliser push pour ajouter l'ID de la carte
        collections[collectionId].cardIds.push(nextCardId);
        nextCardId++; // Incrémenter l'ID de la prochaine carte
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
}
