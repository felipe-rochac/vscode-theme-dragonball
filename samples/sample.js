// Sample JavaScript code to preview Dragon Ball theme colors

// Function to simulate a Kamehameha attack
function kamehameha(attacker, target) {
    console.log(`${attacker} charges up...`);
    setTimeout(() => {
        console.log(`${attacker}: "Kame...hame...HA!"`);
        setTimeout(() => {
            console.log(`${target} is hit by a massive energy wave!`);
        }, 1000);
    }, 1000);
}

// Characters
const goku = "Goku";
const frieza = "Frieza";

// Start the battle
console.log("Dragon Ball Theme Sample");
kamehameha(goku, frieza);

// Example of a class
class Saiyan {
    constructor(name, powerLevel) {
        this.name = name;
        this.powerLevel = powerLevel;
    }
    transform() {
        console.log(`${this.name} transforms! Power level: ${this.powerLevel * 50}`);
    }
}

const vegeta = new Saiyan("Vegeta", 9000);
vegeta.transform();