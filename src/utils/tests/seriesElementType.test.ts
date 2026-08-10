import { Series } from "../../types";
import {
    createBarGroupIndexBySeriesIndex,
    getClosestBarPositionDistance,
    groupSeriesByElementType,
    resolveContinuousRangeDomainPadding,
    resolvePadBandRange,
    resolveRenderedBarWidth,
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
        const indices = createBarGroupIndexBySeriesIndex([
            createSeries(0, "bar"),
            createSeries(1, "line"),
            createSeries(2, "bar"),
        ]);

        expect(Array.from(indices)).toEqual([
            [0, 0],
            [2, 1],
        ]);
    });

    it("shares a band group inside one stacked axis and separates different axes", () => {
        const first = createSeries(0, "bar");
        const second = createSeries(1, "bar");
        const third = createSeries(2, "bar");

        first.secondaryAxisId = "left";
        second.secondaryAxisId = "left";
        third.secondaryAxisId = "right";

        const indices = createBarGroupIndexBySeriesIndex(
            [first, second, third],
            [
                { id: "left", stacked: true },
                { id: "right", stacked: true },
            ]
        );

        expect(Array.from(indices)).toEqual([
            [0, 0],
            [1, 0],
            [2, 1],
        ]);
    });

    it("uses the closest distinct primary position as the continuous band interval", () => {
        expect(getClosestBarPositionDistance([0, 100, 60, 100, Number.NaN], 300)).toBe(40);
        expect(getClosestBarPositionDistance([100, 100], 300)).toBe(300);
    });

    it("automatically pads a continuous range only when bar series are present", () => {
        const bar = createSeries(0, "bar");
        const line = createSeries(1, "line");

        expect(resolvePadBandRange(undefined, [line])).toBe(false);
        expect(resolvePadBandRange(undefined, [line, bar])).toBe(true);
        expect(resolvePadBandRange(false, [bar])).toBe(false);
        expect(resolvePadBandRange(true, [line])).toBe(true);
    });

    it("uses the rendered bar width when min/max constraints are present", () => {
        expect(resolveRenderedBarWidth(80, 1, 48)).toBe(48);
        expect(resolveRenderedBarWidth(0.25, 2, 48)).toBe(2);
        expect(resolveRenderedBarWidth(24, undefined, undefined)).toBe(24);
    });

    it("converts a pixel edge inset to an exact continuous-domain extension", () => {
        const domainPadding = resolveContinuousRangeDomainPadding(100, 800, 40);
        const finalDomainLength = 100 + domainPadding * 2;

        expect((domainPadding / finalDomainLength) * 800).toBeCloseTo(40);
    });

    it("uses shifted interaction positions when every series is a bar", () => {
        const bar = createSeries(0, "bar");
        const line = createSeries(1, "line");

        expect(shouldUseBarInteractionPosition([bar], [{ stacked: false }])).toBe(true);
        expect(shouldUseBarInteractionPosition([bar, line], [{ stacked: false }])).toBe(false);
        expect(shouldUseBarInteractionPosition([bar], [{ stacked: true }])).toBe(true);
    });
});
