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

export function createBarGroupIndexBySeriesIndex<TDatum>(
    series: Series<TDatum>[],
    secondaryAxes: Array<{ id?: string | number; stacked?: boolean }> = []
): Map<number, number> {
    const barGroupIndexBySeriesIndex = new Map<number, number>();
    const stackedGroupIndexByAxisId = new Map<string | number | undefined, number>();
    let nextGroupIndex = 0;

    for (const item of series) {
        if (item.elementType !== "bar") {
            continue;
        }

        const secondaryAxis = secondaryAxes.find(axis => axis.id === item.secondaryAxisId);

        // Все серии stacked-оси должны занимать один слот. Для каждой другой
        // серии и каждой другой stacked-оси выделяется отдельное смещение.
        if (secondaryAxis?.stacked) {
            let groupIndex = stackedGroupIndexByAxisId.get(item.secondaryAxisId);

            if (groupIndex === undefined) {
                groupIndex = nextGroupIndex++;
                stackedGroupIndexByAxisId.set(item.secondaryAxisId, groupIndex);
            }

            barGroupIndexBySeriesIndex.set(item.index, groupIndex);
        } else {
            barGroupIndexBySeriesIndex.set(item.index, nextGroupIndex++);
        }
    }

    return barGroupIndexBySeriesIndex;
}

export function getClosestBarPositionDistance(positions: number[], fallbackDistance: number): number {
    const sortedPositions = Array.from(new Set(positions.filter(Number.isFinite))).sort((left, right) => left - right);
    let closestDistance = fallbackDistance;

    for (let index = 1; index < sortedPositions.length; index++) {
        const distance = sortedPositions[index] - sortedPositions[index - 1];

        if (distance > 0) {
            closestDistance = Math.min(closestDistance, distance);
        }
    }

    return closestDistance;
}

export function shouldUseBarInteractionPosition<TDatum>(
    series: Series<TDatum>[],
    _secondaryAxes: Array<{ id?: string | number; stacked?: boolean }>
): boolean {
    return series.length > 0 && series.every(item => item.elementType === "bar");
}

/**
 * Определяет необходимость расширить continuous primary range под крайние bar.
 * Явное значение оси имеет приоритет, иначе наличие хотя бы одной bar-серии
 * включает padding автоматически, в том числе в mixed line/bar графике.
 */
export function resolvePadBandRange<TDatum>(padBandRange: boolean | undefined, series: Series<TDatum>[]): boolean {
    return padBandRange ?? series.some(item => item.elementType === "bar");
}

/** Ограничивает фактическую ширину bar теми же правилами, которые использует renderer. */
export function resolveRenderedBarWidth(
    allocatedBandWidth: number,
    minBandSize: number | undefined,
    maxBandSize: number | undefined
): number {
    const allocatedWidth = Math.max(allocatedBandWidth, 0);
    const minWidth = Math.max(minBandSize ?? 1, 0);
    const maxWidth = Math.max(maxBandSize ?? Number.POSITIVE_INFINITY, 0);

    return Math.min(Math.max(allocatedWidth, minWidth), maxWidth);
}

/**
 * Переводит требуемый краевой отступ в единицы continuous-domain так, чтобы
 * после расширения исходные крайние значения оказались на заданном расстоянии.
 */
export function resolveContinuousRangeDomainPadding(
    domainLength: number,
    availableLength: number,
    requiredPadding: number
): number {
    const safePadding = Math.min(Math.max(requiredPadding, 0), Math.max(availableLength / 2 - 0.5, 0));
    const availableDataLength = availableLength - safePadding * 2;

    return domainLength > 0 && availableDataLength > 0 ? (domainLength * safePadding) / availableDataLength : 0;
}
