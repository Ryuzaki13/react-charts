import { Axis, Datum } from "../../types";
import { getPrimary, getPrimaryLength } from "../Bar";

type TestDatum = {
    value: number;
};

function createDatum(seriesIndex: number): Datum<TestDatum> {
    const originalSeries = {
        data: [],
        elementType: "bar" as const,
    };

    return {
        originalSeries,
        seriesIndex,
        seriesIndexPerAxis: seriesIndex,
        seriesId: `series-${seriesIndex}`,
        seriesLabel: `Series ${seriesIndex}`,
        elementType: "bar",
        index: 0,
        originalDatum: { value: seriesIndex },
        primaryValue: 0,
        secondaryValue: seriesIndex,
    };
}

function createPrimaryAxis(offsets: Map<number, number>, maxBandSize?: number): Axis<TestDatum> {
    const seriesBandScale = Object.assign((seriesIndex: number) => offsets.get(seriesIndex), { bandwidth: () => 32 });

    return {
        axisFamily: "time",
        scale: () => 150,
        primaryBandScale: { bandwidth: () => 80 },
        seriesBandScale,
        maxBandSize,
    } as unknown as Axis<TestDatum>;
}

const secondaryAxis = {} as Axis<TestDatum>;

describe("bar geometry", () => {
    it("places time bars from one Y axis into adjacent slots", () => {
        const primaryAxis = createPrimaryAxis(
            new Map([
                [0, 0],
                [1, 40],
            ])
        );
        const firstDatum = createDatum(0);
        const secondDatum = createDatum(1);
        const firstStart = getPrimary(firstDatum, primaryAxis, secondaryAxis);
        const secondStart = getPrimary(secondDatum, primaryAxis, secondaryAxis);
        const firstEnd = firstStart + getPrimaryLength(firstDatum, primaryAxis, secondaryAxis);

        expect(firstStart).toBeLessThan(secondStart);
        expect(firstEnd).toBeLessThanOrEqual(secondStart);
    });

    it("uses one slot for a stacked group and another slot for a different Y axis", () => {
        const primaryAxis = createPrimaryAxis(
            new Map([
                [0, 0],
                [1, 0],
                [2, 40],
            ])
        );
        const firstLeftDatum = createDatum(0);
        const secondLeftDatum = createDatum(1);
        const rightDatum = createDatum(2);
        const firstLeftStart = getPrimary(firstLeftDatum, primaryAxis, secondaryAxis);
        const secondLeftStart = getPrimary(secondLeftDatum, primaryAxis, secondaryAxis);
        const rightStart = getPrimary(rightDatum, primaryAxis, secondaryAxis);
        const leftEnd = firstLeftStart + getPrimaryLength(firstLeftDatum, primaryAxis, secondaryAxis);

        expect(firstLeftStart).toBe(secondLeftStart);
        expect(leftEnd).toBeLessThanOrEqual(rightStart);
    });

    it("centers a bar constrained by maxBandSize inside its series slot", () => {
        const primaryAxis = createPrimaryAxis(new Map([[0, 0]]), 12);
        const datum = createDatum(0);
        const renderedLength = getPrimaryLength(datum, primaryAxis, secondaryAxis);
        const renderedCenter = getPrimary(datum, primaryAxis, secondaryAxis) + renderedLength / 2;
        const groupStart = 150 - 80 / 2;
        const allocatedCenter = groupStart + 32 / 2;

        expect(renderedLength).toBe(12);
        expect(renderedCenter).toBe(allocatedCenter);
    });
});
