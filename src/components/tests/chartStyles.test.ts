import { resolveAxisTickLabelStyle } from "../AxisLinear";
import { resolveCursorLabelStyle, resolveCursorLineStyle } from "../Cursors";

describe("chart style options", () => {
    it("overrides axis tick typography without losing layout defaults", () => {
        expect(resolveAxisTickLabelStyle(false, "hanging", "middle", { fontSize: 18, fontWeight: 700 })).toEqual({
            fontSize: 18,
            fill: "rgba(0,0,0, .7)",
            dominantBaseline: "hanging",
            textAnchor: "middle",
            fontWeight: 700,
        });
    });

    it("applies cursor line overrides after its calculated geometry", () => {
        expect(resolveCursorLineStyle(120, 2, "black", { height: 4, opacity: 0.8 })).toEqual({
            width: "120px",
            height: 4,
            position: "absolute",
            top: 0,
            left: 0,
            background: "black",
            opacity: 0.8,
        });
    });

    it("applies cursor label typography while preserving its anchor transform", () => {
        expect(resolveCursorLabelStyle(true, -50, 0, { fontSize: 16 })).toMatchObject({
            fontSize: 16,
            transform: "translate3d(-50%, 0%, 0)",
            whiteSpace: "nowrap",
        });
    });
});
