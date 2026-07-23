import { BuildAxisOptions, Series, SeriesElementType, UserSerie } from "../types";

const seriesElementRenderOrder: Record<SeriesElementType, number> = {
    bar: 0,
    area: 1,
    line: 2,
    bubble: 3,
};

export function resolveSeriesElementType<TDatum>(
    series: UserSerie<TDatum>,
    secondaryAxes: BuildAxisOptions<TDatum>[]
): SeriesElementType {
    const secondaryAxis = secondaryAxes.find(axis => axis.id === series.secondaryAxisId);

    return series.elementType ?? secondaryAxis?.elementType ?? "line";
}

export function groupSeriesByElementType<TDatum>(series: Series<TDatum>[]): [SeriesElementType, Series<TDatum>[]][] {
    const groupedSeries = new Map<SeriesElementType, Series<TDatum>[]>();

    for (const item of series) {
        const group = groupedSeries.get(item.elementType);

        if (group) {
            group.push(item);
        } else {
            groupedSeries.set(item.elementType, [item]);
        }
    }

    return Array.from(groupedSeries).sort(
        ([leftType], [rightType]) => seriesElementRenderOrder[leftType] - seriesElementRenderOrder[rightType]
    );
}

export function createBarSeriesIndexBySeriesIndex<TDatum>(series: Series<TDatum>[]): Map<number, number> {
    const barIndexBySeriesIndex = new Map<number, number>();

    for (const item of series) {
        if (item.elementType === "bar") {
            barIndexBySeriesIndex.set(item.index, barIndexBySeriesIndex.size);
        }
    }

    return barIndexBySeriesIndex;
}

export function shouldUseBarInteractionPosition<TDatum>(
    series: Series<TDatum>[],
    secondaryAxes: Array<{ id?: string | number; stacked?: boolean }>
): boolean {
    return (
        series.length > 0 &&
        series.every(item => {
            const secondaryAxis = secondaryAxes.find(axis => axis.id === item.secondaryAxisId);

            return item.elementType === "bar" && !secondaryAxis?.stacked;
        })
    );
}
