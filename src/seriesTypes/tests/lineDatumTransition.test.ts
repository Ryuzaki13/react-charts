import { datumElementTransition } from "../datumElementTransition";

describe("datumElementTransition", () => {
    it("анимирует визуальное состояние, но не координаты точки", () => {
        expect(datumElementTransition).toContain("r .3s ease-out");
        expect(datumElementTransition).toContain("opacity .3s ease-out");
        expect(datumElementTransition).not.toContain("all");
        expect(datumElementTransition).not.toContain("cx");
        expect(datumElementTransition).not.toContain("cy");
    });
});
