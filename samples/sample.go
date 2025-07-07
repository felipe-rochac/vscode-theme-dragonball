package main

import (
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
)

// ThemeSample demonstrates various aspects of theme customizations in VS Code.
func main() {
	fmt.Println("=== Dragon Ball Theme Customizations Sample ===")

	// 1. Syntax Highlighting
	var powerLevel int = 9001
	name := "Goku"
	isSaiyan := true
	techniques := []string{"Kamehameha", "Spirit Bomb", "Instant Transmission"}

	fmt.Printf("Character: %s\n", name)
	fmt.Printf("UUID: %s\n", uuid.NewString())

	fmt.Printf("Name: %s\n", name)
	fmt.Printf("Power Level: %d\n", powerLevel)
	fmt.Printf("Is Saiyan: %t\n", isSaiyan)
	fmt.Println("Techniques:")
	for i, tech := range techniques {
		fmt.Printf("  %d. %s\n", i+1, tech)
	}

	// 2. Function and Struct Highlighting
	type Character struct {
		Name       string
		PowerLevel int
	}

	vegeta := Character{Name: "Vegeta", PowerLevel: 8500}
	fmt.Printf("Rival: %+v\n", vegeta)

	// 3. Error and Warning Highlighting
	if vegeta.PowerLevel < powerLevel {
		fmt.Fprintln(os.Stderr, "Warning: Vegeta's power level is lower than Goku's!")
	}

	// 4. String, Number, Boolean, and Nil Highlighting
	var dragonBalls map[string]int = nil
	fmt.Printf("Dragon Balls: %v\n", dragonBalls)

	// 5. Comment Highlighting
	// This is a single-line comment
	/*
	   This is a multi-line comment
	   Try customizing comment colors in your theme!
	*/

	// 6. Constant Highlighting
	const maxPower = 10000
	fmt.Printf("Max Power: %d\n", maxPower)

	// 7. Keyword Highlighting
	for i := 0; i < 3; i++ {
		fmt.Printf("Training session %d\n", i+1)
		time.Sleep(100 * time.Millisecond)
	}

	fmt.Println("=== End of Sample ===")
}
