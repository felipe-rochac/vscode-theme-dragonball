// sample.ts
// This file demonstrates various TypeScript syntax elements for theme testing.

interface Character {
    name: string;
    powerLevel: number;
    isSaiyan?: boolean;
}

enum Saga {
    Saiyan,
    Frieza,
    Cell,
    Buu,
}

function powerUp(character: Character, increment: number): Character {
    return { ...character, powerLevel: character.powerLevel + increment };
}

const goku: Character = {
    name: "Goku",
    powerLevel: 9001,
    isSaiyan: true,
};

const vegeta: Character = {
    name: "Vegeta",
    powerLevel: 8500,
    isSaiyan: true,
};

const saga: Saga = Saga.Frieza;

console.log(`Current saga: ${Saga[saga]}`);
console.log(`${goku.name} power level: ${goku.powerLevel}`);
console.log(`${vegeta.name} power level: ${vegeta.powerLevel}`);

const poweredUpGoku = powerUp(goku, 5000);
console.log(`${poweredUpGoku.name} new power level: ${poweredUpGoku.powerLevel}`);

// Example of a class
class DragonBall {
    constructor(public wish: string) {}

    grantWish(): string {
        return `Wish granted: ${this.wish}`;
    }
}

const dragonBall = new DragonBall("Infinite power");
console.log(dragonBall.grantWish());