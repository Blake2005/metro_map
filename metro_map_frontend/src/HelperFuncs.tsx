// Checks whether a user-supplied string converts to an integer number.
// Input:  userInput - string the user typed into the route input.
// Output: boolean - true if converting the string with Number() yields an integer value, false otherwise.

export function isInteger(userInput: string) {
    const conversion: number = Number(userInput)
    return Number.isInteger(conversion);
}

// Generates a random hex color string.
// Input:  None - uses Math.random internally.
// Output: string - random hex color code.

export function getRandomColor(){
    const color = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    return color
}