// Checks whether a user supplied string is a valid integer.
// Input:  userInput - string the user typed into the route input.
// Output: boolean - true if the string converts to an integer, false otherwise.

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