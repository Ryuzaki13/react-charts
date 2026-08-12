import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { type Axis, type ChartContextValue, type Datum, type Series } from "../../types";
import { ChartContextProvider } from "../../utils/chartContext";
import BarDatumLabels from "../BarDatumLabels";

type TestDatum = {
    value: number;
};

function createBarDatum(): Datum<TestDatum> {
    const originalSeries = { data: [{ value: 20 }], elementType: "bar" as const };

    return {
        originalSeries,
        seriesIndex: 0,
        seriesIndexPerAxis: 0,
        seriesId: "revenue",
        seriesLabel: "Revenue",
        elementType: "bar",
        index: 0,
        originalDatum: originalSeries.data[0],
        primaryValue: 0,
        secondaryValue: 20,
    };
}

function createPrimaryAxis(): Axis<TestDatum> {
    const scale = Object.assign(() => 50, { range: () => [0, 200] });
    const primaryBandScale = Object.assign(() => 0, { bandwidth: () => 32 });
    const seriesBandScale = Object.assign(() => 0, { bandwidth: () => 32 });

    return {
        axisFamily: "time",
        isVertical: false,
        scale,
        primaryBandScale,
        seriesBandScale,
    } as unknown as Axis<TestDatum>;
}

function createSecondaryAxis(): Axis<TestDatum> {
    const scale = Object.assign((value: number) => 100 - value, { range: () => [100, 0] });

    return {
        axisFamily: "linear",
        id: "left",
        isVertical: true,
        scale,
        showDatumLabels: true,
        formatters: {
            datumLabel: (value: number) => `Значение ${value}`,
        },
    } as unknown as Axis<TestDatum>;
}

describe("BarDatumLabels", () => {
    it("renders a formatted label for a visible bar datum", () => {
        const datum = createBarDatum();
        const series: Series<TestDatum> = {
            originalSeries: datum.originalSeries,
            index: 0,
            indexPerAxis: 0,
            id: datum.seriesId,
            label: datum.seriesLabel,
            elementType: "bar",
            datums: [datum],
        };
        const primaryAxis = createPrimaryAxis();
        const secondaryAxis = createSecondaryAxis();
        const context = {
            getSeriesStatusStyle: () => ({ color: "red" }),
            getDatumStatusStyle: () => ({}),
            focusedDatumState: [null, jest.fn()],
            gridDimensions: { left: 10, top: 10, right: 0, bottom: 0, width: 200, height: 100 },
        } as unknown as ChartContextValue<TestDatum>;

        const markup = renderToStaticMarkup(
            <ChartContextProvider value={() => context}>
                <svg>
                    <BarDatumLabels
                        focusedDatum={null}
                        primaryAxis={primaryAxis}
                        secondaryAxis={secondaryAxis}
                        series={[series]}
                    />
                </svg>
            </ChartContextProvider>
        );

        expect(markup).toContain("Значение 20");
        expect(markup).toContain('data-datum-label=""');
        expect(markup).toContain('x="50"');
        expect(markup).toContain('y="72"');
    });
});
