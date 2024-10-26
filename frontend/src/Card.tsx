// Card.tsx
import React from 'react';
import styles from './Card.module.css'; // Assurez-vous d'utiliser un module CSS pour éviter les conflits de noms

interface CardProps {
    title: string;
    image: string;
}

const Card: React.FC<CardProps> = ({ title, image }) => {
    return (
        <div className={styles.card}>
            <img src={image} alt={title} className={styles.cardImage} />
            <h4 className={styles.cardTitle}>{title}</h4>
        </div>
    );
};

export default Card;
