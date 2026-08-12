import React from "react";

import { type Axis, type Datum, type Series } from "../types";
import { translate } from "../utils/Utils";
import useChartContext from "../utils/chartContext";
import { getPrimary, getPrimaryLength } from "./Bar";
import { DatumLabel, type DatumLabelLayout, getDatumLabelFontSize } from "./DatumLabel";

const datumLabelOffset = 8;
const datumLabelEdgePadding = 2;

/**
 * Рендерит подписи у фактического конца каждого столбца. Положение рассчитывается
 * одинаково для вертикальных и горизонтальных bar, положительных и отрицательных значений.
 */
export default function BarDatumLabels<TDatum>({
    focusedDatum: focusedDatumFromProps,
    primaryAxis,
    secondaryAxis,
    series: allSeries,
}: {
    focusedDatum: Datum<TDatum> | null;
    primaryAxis: Axis<TDatum>;
    secondaryAxis: Axis<TDatum>;
    series: Series<TDatum>[];
}) {
    const { getSeriesStatusStyle, getDatumStatusStyle, focusedDatumState, gridDimensions } = useChartContext<TDatum>();
    const [focusedDatumFromContext] = focusedDatumState;
    const showDatumLabels = secondaryAxis.showDatumLabels ?? false;
    const focusedDatum = showDatumLabels === "onFocus" ? focusedDatumFromProps : focusedDatumFromContext;

    if (!showDatumLabels) {
        return null;
    }

    return (
        <g
            style={{
                pointerEvents: "none",
                transform: translate(gridDimensions.left, gridDimensions.top),
            }}
        >
            {allSeries.map((series, seriesIndex) => {
                const seriesStyle = getSeriesStatusStyle(series, focusedDatum);

                return (
                    <g key={`bar-labels-${seriesIndex}`}>
                        {series.datums.map((datum, datumIndex) => {
                            const showLabel = showDatumLabels === "onFocus" ? datum === focusedDatum : showDatumLabels;

                            if (!showLabel) {
                                return null;
                            }

                            const primaryCenter =
                                getPrimary(datum, primaryAxis, secondaryAxis) +
                                getPrimaryLength(datum, primaryAxis, secondaryAxis) / 2;
                            const secondaryEndpoint = getSecondaryDatumValue(datum, secondaryAxis);
                            const secondaryBaseline = getSecondaryDatumBaseline(datum, secondaryAxis);

                            if (![primaryCenter, secondaryEndpoint, secondaryBaseline].every(Number.isFinite)) {
                                return null;
                            }

                            const datumStyle = getDatumStatusStyle(datum, focusedDatum);
                            const layout = resolveBarDatumLabelLayout({
                                primaryAxisVertical: primaryAxis.isVertical,
                                primaryCenter,
                                secondaryEndpoint,
                                secondaryBaseline,
                                width: gridDimensions.width,
                                height: gridDimensions.height,
                                fontSize: getDatumLabelFontSize(secondaryAxis.datumLabelStyle),
                            });

                            return (
                                <DatumLabel
                                    key={`bar-label-${datumIndex}`}
                                    datum={datum}
                                    layout={layout}
                                    secondaryAxis={secondaryAxis}
                                    series={series}
                                    seriesStyle={seriesStyle}
                                    datumStyle={datumStyle}
                                />
                            );
                        })}
                    </g>
                );
            })}
        </g>
    );
}

/** Входные координаты для чистого расчёта положения bar datum label. */
export type BarDatumLabelLayoutOptions = {
    primaryAxisVertical: boolean;
    primaryCenter: number;
    secondaryEndpoint: number;
    secondaryBaseline: number;
    width: number;
    height: number;
    fontSize: number;
};

/**
 * Ставит подпись с внешней стороны конца столбца. У края области построения подпись
 * переносится внутрь столбца, чтобы не обрезаться SVG viewport-ом.
 */
export function resolveBarDatumLabelLayout({
    primaryAxisVertical,
    primaryCenter,
    secondaryEndpoint,
    secondaryBaseline,
    width,
    height,
    fontSize,
}: BarDatumLabelLayoutOptions): DatumLabelLayout {
    return primaryAxisVertical
        ? resolveHorizontalBarDatumLabelLayout(primaryCenter, secondaryEndpoint, secondaryBaseline, width, height)
        : resolveVerticalBarDatumLabelLayout(
              primaryCenter,
              secondaryEndpoint,
              secondaryBaseline,
              width,
              height,
              fontSize
          );
}

function resolveVerticalBarDatumLabelLayout(
    primaryCenter: number,
    endpoint: number,
    baseline: number,
    width: number,
    height: number,
    fontSize: number
): DatumLabelLayout {
    const x = clamp(
        primaryCenter,
        datumLabelEdgePadding,
        Math.max(datumLabelEdgePadding, width - datumLabelEdgePadding)
    );
    const growsUp = endpoint <= baseline;
    const outerY = endpoint + (growsUp ? -datumLabelOffset : datumLabelOffset);
    const minBaselineY = fontSize + datumLabelEdgePadding;
    const maxHangingY = Math.max(datumLabelEdgePadding, height - fontSize - datumLabelEdgePadding);

    if (growsUp && outerY >= minBaselineY) {
        return { x, y: outerY, dominantBaseline: "auto", textAnchor: "middle", primaryPosition: primaryCenter };
    }

    if (!growsUp && outerY <= maxHangingY) {
        return { x, y: outerY, dominantBaseline: "hanging", textAnchor: "middle", primaryPosition: primaryCenter };
    }

    return growsUp
        ? {
              x,
              y: clamp(endpoint + datumLabelOffset, datumLabelEdgePadding, maxHangingY),
              dominantBaseline: "hanging",
              textAnchor: "middle",
              primaryPosition: primaryCenter,
          }
        : {
              x,
              y: clamp(
                  endpoint - datumLabelOffset,
                  minBaselineY,
                  Math.max(minBaselineY, height - datumLabelEdgePadding)
              ),
              dominantBaseline: "auto",
              textAnchor: "middle",
              primaryPosition: primaryCenter,
          };
}

function resolveHorizontalBarDatumLabelLayout(
    primaryCenter: number,
    endpoint: number,
    baseline: number,
    width: number,
    height: number
): DatumLabelLayout {
    const y = clamp(
        primaryCenter,
        datumLabelEdgePadding,
        Math.max(datumLabelEdgePadding, height - datumLabelEdgePadding)
    );
    const growsRight = endpoint >= baseline;
    const outerX = endpoint + (growsRight ? datumLabelOffset : -datumLabelOffset);
    const minX = datumLabelEdgePadding;
    const maxX = Math.max(minX, width - datumLabelEdgePadding);

    if (growsRight && outerX <= maxX) {
        return { x: outerX, y, dominantBaseline: "middle", textAnchor: "start", primaryPosition: primaryCenter };
    }

    if (!growsRight && outerX >= minX) {
        return { x: outerX, y, dominantBaseline: "middle", textAnchor: "end", primaryPosition: primaryCenter };
    }

    return growsRight
        ? {
              x: clamp(endpoint - datumLabelOffset, minX, maxX),
              y,
              dominantBaseline: "middle",
              textAnchor: "end",
              primaryPosition: primaryCenter,
          }
        : {
              x: clamp(endpoint + datumLabelOffset, minX, maxX),
              y,
              dominantBaseline: "middle",
              textAnchor: "start",
              primaryPosition: primaryCenter,
          };
}

function getSecondaryDatumValue<TDatum>(datum: Datum<TDatum>, secondaryAxis: Axis<TDatum>): number {
    return secondaryAxis.scale(secondaryAxis.stacked ? (datum.stackData?.[1] ?? NaN) : datum.secondaryValue) ?? NaN;
}

function getSecondaryDatumBaseline<TDatum>(datum: Datum<TDatum>, secondaryAxis: Axis<TDatum>): number {
    return secondaryAxis.scale(secondaryAxis.stacked ? (datum.stackData?.[0] ?? NaN) : 0) ?? NaN;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}
