import { useCallback, useLayoutEffect, useState } from "preact/hooks";

/**
 * useFetcher is SWR-like but way lighter.
 * Uses @zouloux/fetcher.
 * Will never fetch data on server.
 * API Usage :
 * // First, create your fetcher. A fetcher is a function which can call API endpoints
 * const fetcher = createFetcher({
 *     buildURI () {
 *         return "/api/1.0/endpoint.json"
 *     }
 * })
 * // Later, in a react component
 * function MyComponent () {
 *     const { data, isLoading, error } = useFetcher( fetcher, [] )
 * 	   return <div>
 * 	       { isLoading ? "Loading" : data }
 * 	   </div>
 * }
 * @see : https://github.com/zouloux/fetcher
 * @see : https://swr.vercel.app/
 * @param fetcherFunction Fetcher function to call, from createFetcher
 * @param fetcherArguments Fetcher arguments, calls fetcher if is not null.
 * @param defaultValue If defined, will not call and set default value to this object
 */
export function useFetcher <
	TFetcher extends ((...args:any) => Promise<any>)
>
( fetcherFunction:TFetcher, fetcherArguments:Parameters<TFetcher> = null, defaultValue?:Awaited<ReturnType<TFetcher>> ):{
	data: Awaited<ReturnType<TFetcher>>,
	refresh: ( fetcherArguments?:Parameters<TFetcher> ) => void,
	isLoading: boolean,
	error: any,
	updateData: ( newDataSet:Awaited<ReturnType<TFetcher>> ) => void,
} {
	const [ data, setFetcherState ] = useState( defaultValue )
	const [ isLoading, setLoadingState ] = useState( fetcherArguments !== null && !defaultValue )
	const [ error, setError ] = useState( null )
	const [ isDisposed, setIsDisposed ] = useState( false )
	// Call or refresh fetcher
	const refresh = useCallback( async ( newFetcherArguments:Parameters<TFetcher> ) => {
		if ( isDisposed )
			return
		// Get old fetcher arguments if given as null
		if ( newFetcherArguments === null || newFetcherArguments === undefined )
			newFetcherArguments = fetcherArguments
		// Abort previous request to avoid race conditions
		setLoadingState( true )
		setError( null )
		setFetcherState( null )
		try {
			// @ts-ignore
			const data = await fetcherFunction( ...newFetcherArguments )
			// await delay(1)
			if ( isDisposed )
				return
			setLoadingState( false )
			setFetcherState( data )
		}
		catch ( caughtError ) {
			if ( isDisposed )
				return
			console.error( caughtError )
			setLoadingState( false )
			setError( caughtError )
		}
	}, [])
	// Auto-call fetcher if we have some arguments
	// Will not happen in server
	useLayoutEffect(() => {
		if ( fetcherArguments !== null && !defaultValue )
			refresh( fetcherArguments )
		return () => setIsDisposed( true )
	}, [])
	// Return use fetcher api with states
	return { refresh, isLoading, data, error, updateData: setFetcherState }
}