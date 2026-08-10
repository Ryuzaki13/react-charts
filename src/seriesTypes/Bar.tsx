import React from "react";

import { Axis, AxisBand, Datum, Series } from "../types";
import { translate } from "../utils/Utils";
import useChartContext from "../utils/chartContext";
import { resolveRenderedBarWidth } from "../utils/seriesElementType";

//

export default function BarComponent<TDatum>({
    primaryAxis,
    secondaryAxis,
    series: allSeries,
}: {
    primaryAxis: Axis<TDatum>;
    secondaryAxis: Axis<TDatum>;
    series: Series<TDatum>[];
}) {
    const { getSeriesStatusStyle, getDatumStatusStyle, focusedDatumState, gridDimensions } = useChartContext<TDatum>();

    const [focusedDatum] = focusedDatumState;

    const xAxis = primaryAxis.isVertical ? secondaryAxis : primaryAxis;
    const yAxis = primaryAxis.isVertical ? primaryAxis : secondaryAxis;

    return (
        <g
            style={{
                transform: translate(gridDimensions.left, gridDimensions.top),
            }}
        >
            {allSeries.map((series, i) => {
                const style = getSeriesStatusStyle(series, focusedDatum);

                return (
                    <g key={`lines-${i}`}>
                        {series.datums.map((datum, i) => {
                            const dataStyle = getDatumStatusStyle(datum, focusedDatum);

                            const [x, width] = clampPxToAxis(
                                getRectX(datum, primaryAxis, secondaryAxis) ?? NaN,
                                getWidth(datum, primaryAxis, secondaryAxis) ?? NaN,
                                xAxis
                            );
                            const [y, height] = clampPxToAxis(
                                getRectY(datum, primaryAxis, secondaryAxis) ?? NaN,
                                getHeight(datum, primaryAxis, secondaryAxis) ?? NaN,
                                yAxis
                            );

                            return (
                                <rect
                                    {...{
                                        ref: el => {
                                            datum.element = el;
                                        },
                                        key: i,
                                        x,
                                        y,
                                        width,
                                        height,
                                        style: {
                                            strokeWidth: 0,
                                            ...style,
                                            ...style.rectangle,
                                            ...dataStyle,
                                            ...dataStyle.rectangle,
                                        },
                                    }}
                                />
                            );
                        })}
                    </g>
                );
            })}
        </g>
    );
}

function getWidth<TDatum>(datum: Datum<TDatum>, primaryAxis: Axis<TDatum>, secondaryAxis: Axis<TDatum>): number {
    return primaryAxis.isVertical
        ? getSecondaryLength(datum, secondaryAxis)
        : getPrimaryLength(datum, primaryAxis, secondaryAxis);
}

function getHeight<TDatum>(datum: Datum<TDatum>, primaryAxis: Axis<TDatum>, secondaryAxis: Axis<TDatum>): number {
    return primaryAxis.isVertical
        ? getPrimaryLength(datum, primaryAxis, secondaryAxis)
        : getSecondaryLength(datum, secondaryAxis);
}

export function getPrimaryGroupLength<TDatum>(_datum: Datum<TDatum>, primaryAxis: Axis<TDatum>) {
    return Math.max(primaryAxis.primaryBandScale?.bandwidth() ?? 0, 0);
}

export function getPrimaryLength<TDatum>(
    _datum: Datum<TDatum>,
    primaryAxis: Axis<TDatum>,
    _secondaryAxis: Axis<TDatum>
) {
    const bandWidth = Math.max(primaryAxis.seriesBandScale?.bandwidth() ?? 0, 0);

    return resolveRenderedBarWidth(bandWidth, primaryAxis.minBandSize, primaryAxis.maxBandSize);
}

function getSecondaryLength<TDatum>(datum: Datum<TDatum>, secondaryAxis: Axis<TDatum>): number {
    const secondary = [getSecondaryStart(datum, secondaryAxis), getSecondary(datum, secondaryAxis)];

    return Math.abs(secondary[1] - secondary[0]);
}

function getRectX<TDatum>(datum: Datum<TDatum>, primaryAxis: Axis<TDatum>, secondaryAxis: Axis<TDatum>): number {
    return primaryAxis.isVertical
        ? getSecondaryStart(datum, secondaryAxis)
        : getPrimary(datum, primaryAxis, secondaryAxis);
}

function getRectY<TDatum>(datum: Datum<TDatum>, primaryAxis: Axis<TDatum>, secondaryAxis: Axis<TDatum>): number {
    return primaryAxis.isVertical ? getPrimary(datum, primaryAxis, secondaryAxis) : getSecondary(datum, secondaryAxis);
}

export function getPrimary<TDatum>(
    datum: Datum<TDatum>,
    primaryAxis: Axis<TDatum>,
    secondaryAxis: Axis<TDatum>
): number {
    let primary = primaryAxis.scale(datum.primaryValue) ?? NaN;

    if (primaryAxis.axisFamily !== "band") {
        primary -= getPrimaryGroupLength(datum, primaryAxis) / 2;
    }

    const seriesBandScale = (primaryAxis as AxisBand<any>).seriesBandScale;
    const seriesOffset = seriesBandScale(datum.seriesIndex) ?? NaN;
    const allocatedLength = seriesBandScale.bandwidth();
    const renderedLength = getPrimaryLength(datum, primaryAxis, secondaryAxis);

    primary += seriesOffset + (allocatedLength - renderedLength) / 2;

    return primary;
}

function getSecondaryStart<TDatum>(datum: Datum<TDatum>, secondaryAxis: Axis<TDatum>): number {
    if (secondaryAxis.stacked) {
        return secondaryAxis.scale(datum.stackData?.[0] ?? NaN) ?? NaN;
    }

    return secondaryAxis.scale(datum.secondaryValue < 0 ? datum.secondaryValue : 0) ?? NaN;
}

function getSecondary<TDatum>(datum: Datum<TDatum>, secondaryAxis: Axis<TDatum>): number {
    if (secondaryAxis.stacked) {
        return secondaryAxis.scale(datum.stackData?.[1] ?? NaN) ?? NaN;
    }

    return secondaryAxis.scale(datum.secondaryValue < 0 ? 0 : datum.secondaryValue) ?? NaN;
}

function clampPxToAxis<TDatum>(startPx: number, lengthPx: number, axis: Axis<TDatum>) {
    const range = axis.scale.range();

    if (axis.isVertical) {
        range.reverse();
    }

    const safe = (num: number) => Math.max(range[0], Math.min(num, range[1]));

    const safeStart = safe(startPx);
    const safeEnd = safe(startPx + lengthPx);
    const safeLength = safeEnd - safeStart;

    return [safeStart, safeLength] as const;
}
