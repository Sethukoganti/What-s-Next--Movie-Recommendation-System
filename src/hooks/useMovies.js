// React Query hooks for TMDb data
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  tmdbTrending, tmdbTopRated, tmdbUpcoming, tmdbSearch,
  tmdbMovieDetails, tmdbSimilar, tmdbDiscover
} from '../services/tmdb';

export const USE_TRENDING_KEY = 'trending';
export const USE_TOP_RATED_KEY = 'topRated';
export const USE_UPCOMING_KEY = 'upcoming';
export const USE_SEARCH_KEY = 'search';
export const USE_DETAILS_KEY = 'movieDetails';

export function useTrending(mediaType = 'movie', page = 1) {
  return useQuery({
    queryKey: [USE_TRENDING_KEY, mediaType, page],
    queryFn: () => tmdbTrending(mediaType, page),
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });
}

export function useTopRated(mediaType = 'movie', page = 1, genreId = null) {
  return useQuery({
    queryKey: [USE_TOP_RATED_KEY, mediaType, page, genreId],
    queryFn: () => tmdbTopRated(mediaType, page, genreId),
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });
}

export function useUpcoming(page = 1) {
  return useQuery({
    queryKey: [USE_UPCOMING_KEY, page],
    queryFn: () => tmdbUpcoming(page),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearch(query, page = 1, mediaType = 'multi') {
  return useQuery({
    queryKey: [USE_SEARCH_KEY, query, page, mediaType],
    queryFn: () => tmdbSearch(query, page, mediaType),
    enabled: !!query && query.length >= 2,
    staleTime: 2 * 60 * 1000,
    keepPreviousData: true,
  });
}

export function useMovieDetails(tmdbId, mediaType = 'movie') {
  return useQuery({
    queryKey: [USE_DETAILS_KEY, tmdbId, mediaType],
    queryFn: () => tmdbMovieDetails(tmdbId, mediaType),
    enabled: !!tmdbId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSimilar(tmdbId, mediaType = 'movie', page = 1) {
  return useQuery({
    queryKey: ['similar', tmdbId, mediaType, page],
    queryFn: () => tmdbSimilar(tmdbId, mediaType, page),
    enabled: !!tmdbId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDiscover(params = {}) {
  return useQuery({
    queryKey: ['discover', params],
    queryFn: () => tmdbDiscover(params),
    staleTime: 5 * 60 * 1000,
  });
}

// Pre-fetch helper for navigation
export function usePrefetchTrending(queryClient) {
  return () => {
    queryClient.prefetchQuery({ queryKey: [USE_TRENDING_KEY, 'movie', 1], queryFn: () => tmdbTrending('movie', 1) });
  };
}
