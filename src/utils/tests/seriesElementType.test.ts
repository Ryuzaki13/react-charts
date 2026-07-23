import { Series } from "../../types";
import {
    createBarSeriesIndexBySeriesIndex,
    groupSeriesByElementType,
    resolveSeriesElementType,
    shouldUseBarInteractionPosition,
} from "../seriesElementType";

type TestDatum = {
    value: number;
};

function createSeries(index: number, elementType: Series<TestDatum>["elementType"]): Series<TestDatum> {
    return {
        originalSeries: { data: [], elementType },
        index,
        indexPerAxis: index,
        id: `series-${index}`,
        label: `Series ${index}`,
        elementType,
        datums: [],
    };
}

describe("series element type", () => {
    it("allows a series to override the axis element type", () => {
        expect(
            resolveSeriesElementType<TestDatum>(
                {
                    data: [],
                    elementType: "line",
                    secondaryAxisId: "value",
                },
                [
                    {
                        id: "value",
                        scaleType: "linear",
                        elementType: "bar",
                        position: "left",
                        getValue: datum => datum.value,
                    },
                ]
            )
        ).toBe("line");
    });

    it("inherits the element type from the secondary axis", () => {
        expect(
            resolveSeriesElementType<TestDatum>(
                {
                    data: [],
                    secondaryAxisId: "value",
                },
                [
                    {
                        id: "value",
                        scaleType: "linear",
                        elementType: "bar",
                        position: "left",
                        getValue: datum => datum.value,
                    },
                ]
            )
        ).toBe("bar");
    });

    it("renders bars before line-like series", () => {
        const line = createSeries(0, "line");
        const bar = createSeries(1, "bar");
        const area = createSeries(2, "area");

        expect(groupSeriesByElementType([line, bar, area]).map(([elementType]) => elementType)).toEqual([
            "bar",
            "area",
            "line",
        ]);
    });

    it("allocates band indices only for bar series", () => {
        const indices = createBarSeriesIndexBySeriesIndex([
            createSeries(0, "bar"),
            createSeries(1, "line"),
            createSeries(2, "bar"),
        ]);

        expect(Array.from(indices)).toEqual([
            [0, 0],
            [2, 1],
        ]);
    });

    it("uses shifted interaction positions only when every series is an unstacked bar", () => {
        const bar = createSeries(0, "bar");
        const line = createSeries(1, "line");

        expect(shouldUseBarInteractionPosition([bar], [{ stacked: false }])).toBe(true);
        expect(shouldUseBarInteractionPosition([bar, line], [{ stacked: false }])).toBe(false);
        expect(shouldUseBarInteractionPosition([bar], [{ stacked: true }])).toBe(false);
    });
});
