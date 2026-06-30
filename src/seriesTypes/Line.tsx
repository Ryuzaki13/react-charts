import { area, line } from "d3-shape";
import React from "react";

import { Axis, Datum, Series } from "../types";
import { isDefined, translate } from "../utils/Utils";
import useChartContext from "../utils/chartContext";
//
import { monotoneX } from "../utils/curveMonotone";

export default function Line<TDatum>({
    primaryAxis,
    secondaryAxis,
    series: allSeries,
}: {
    primaryAxis: Axis<TDatum>;
    secondaryAxis: Axis<TDatum>;
    series: Series<TDatum>[];
}) {
    const { getSeriesStatusStyle, getDatumStatusStyle, focusedDatumState, gridDimensions } = useChartContext<TDatum>();

    const curve = secondaryAxis.curve ?? monotoneX;

    const [focusedDatum] = focusedDatumState;

    return (
        <g
            style={{
                transform: translate(gridDimensions.left, gridDimensions.top),
            }}
        >
            {allSeries.map((series, i) => {
                const style = getSeriesStatusStyle(series, focusedDatum);

                let areaPath: null | string = null;

                if (secondaryAxis.elementType === "area") {
                    const _x = (datum: Datum<TDatum>) => getPrimary(datum, primaryAxis);
                    const _y1 = (datum: Datum<TDatum>) =>
                        clampPxToAxis(getSecondaryStart(datum, secondaryAxis), secondaryAxis);
                    const _y2 = (datum: Datum<TDatum>) =>
                        clampPxToAxis(getSecondary(datum, secondaryAxis), secondaryAxis);
                    const areaFn = area<Datum<TDatum>>(_x, _y1, _y2).curve(curve);

                    areaFn.defined(datum => [_x(datum), _y1(datum), _y2(datum)].every(isDefined));

                    areaPath = areaFn(series.datums);
                }

                const _x = (datum: Datum<TDatum>) => getPrimary(datum, primaryAxis);
                const _y = (datum: Datum<TDatum>) => getSecondary(datum, secondaryAxis);
                const lineFn = line<Datum<TDatum>>(_x, _y).curve(curve);
                lineFn.defined(datum => [_x(datum), _y(datum)].every(isDefined));

                const linePath =
                    secondaryAxis.elementType === "area" || secondaryAxis.elementType === "line"
                        ? (lineFn(series.datums) ?? undefined)
                        : undefined;

                const showDatumElements =
                    secondaryAxis.showDatumElements ?? (secondaryAxis.elementType === "bubble" || "onFocus");
                const showDatumLabels = secondaryAxis.showDatumLabels ?? false;

                return (
                    <g key={`lines-${i}`}>
                        {areaPath ? (
                            <path
                                d={areaPath}
                                style={{
                                    strokeWidth: 2,
                                    opacity: 0.5,
                                    ...style,
                                    ...style.area,
                                }}
                            />
                        ) : null}
                        {linePath ? (
                            <path
                                d={linePath}
                                style={{
                                    strokeWidth: 2,
                                    ...style,
                                    ...style.line,
                                    fill: "none",
                                }}
                            />
                        ) : null}
                        {series.datums.map((datum, i) => {
                            const dataStyle = getDatumStatusStyle(datum, focusedDatum);

                            const radius = showDatumElements === "onFocus" ? (datum === focusedDatum ? 4 : 0) : 2;
                            const x = getX(datum, primaryAxis, secondaryAxis);
                            const y = getY(datum, primaryAxis, secondaryAxis);

                            const show =
                                showDatumElements === "onFocus"
                                    ? datum === focusedDatum
                                    : (secondaryAxis.showDatumElements ?? secondaryAxis.elementType === "bubble");
                            const showLabel = showDatumLabels === "onFocus" ? datum === focusedDatum : showDatumLabels;
                            const labelValue = showLabel ? getDatumLabel(datum, secondaryAxis) : null;

                            return (
                                <React.Fragment key={i}>
                                    <circle
                                        ref={el => {
                                            datum.element = el;
                                        }}
                                        cx={x || 0}
                                        cy={y || 0}
                                        style={{
                                            // @ts-ignore
                                            r: radius,
                                            transition: "all .3s ease-out",
                                            ...style,
                                            ...style.circle,
                                            ...dataStyle,
                                            ...dataStyle.circle,
                                            ...(!show ? { opacity: 0 } : {}),
                                        }}
                                    />
                                    {showLabel && [x, y].every(isDefined) ? (
                                        <text
                                            x={x}
                                            y={y - 8}
                                            style={{
                                                fill:
                                                    dataStyle.fill ??
                                                    dataStyle.stroke ??
                                                    style.fill ??
                                                    style.stroke ??
                                                    style.color ??
                                                    "currentColor",
                                                fontSize: 10,
                                                pointerEvents: "none",
                                                textAnchor: "middle",
                                                transition: "all .3s ease-out",
                                                ...secondaryAxis.datumLabelStyle,
                                            }}
                                        >
                                            {labelValue}
                                        </text>
                                    ) : null}
                                </React.Fragment>
                            );
                        })}
                    </g>
                );
            })}
        </g>
    );
}

function getX<TDatum>(datum: Datum<TDatum>, primaryAxis: Axis<TDatum>, secondaryAxis: Axis<TDatum>): number {
    return primaryAxis.isVertical ? getSecondary(datum, secondaryAxis) : getPrimary(datum, primaryAxis);
}

function getY<TDatum>(datum: Datum<TDatum>, primaryAxis: Axis<TDatum>, secondaryAxis: Axis<TDatum>): number {
    return primaryAxis.isVertical ? getPrimary(datum, primaryAxis) : getSecondary(datum, secondaryAxis);
}

function getPrimary<TDatum>(datum: Datum<TDatum>, primaryAxis: Axis<TDatum>): number {
    let primary = primaryAxis.scale(datum.primaryValue) ?? NaN;

    if (primaryAxis.axisFamily === "band") {
        primary += primaryAxis.scale.bandwidth() / 2;
    }

    return primary;
}

function getSecondary<TDatum>(datum: Datum<TDatum>, secondaryAxis: Axis<TDatum>): number {
    if (secondaryAxis.stacked) {
        return secondaryAxis.scale(datum.stackData?.[1] ?? NaN) ?? NaN;
    }

    return secondaryAxis.scale(datum.secondaryValue) ?? NaN;
}

function getSecondaryStart<TDatum>(datum: Datum<TDatum>, secondaryAxis: Axis<TDatum>): number {
    if (secondaryAxis.stacked) {
        return secondaryAxis.scale(datum.stackData?.[0] ?? NaN) ?? NaN;
    }

    return secondaryAxis.scale(0) ?? NaN;
}

function getDatumLabel<TDatum>(datum: Datum<TDatum>, secondaryAxis: Axis<TDatum>) {
    return (secondaryAxis.formatters as { datumLabel: (value: any) => React.ReactNode }).datumLabel(
        datum.secondaryValue
    );
}

function clampPxToAxis<TDatum>(px: number, axis: Axis<TDatum>) {
    const range = axis.scale.range();
    if (axis.isVertical) {
        range.reverse();
    }

    return Math.max(range[0], Math.min(px, range[1]));
}
