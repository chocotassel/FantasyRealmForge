export function getArrayDimensions(arr: any): number {
    let dimensions = 0;
    while (Array.isArray(arr)) {
        dimensions++;
        arr = arr[0];
    }
    return dimensions;
}