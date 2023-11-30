import { h, Fragment } from "preact";
import S from "./LoginPage.module.less"
import { useFetcher } from "../../utils/hooks.utils";
import { authFetchers } from "../../fetchers/auth.fetchers";
import { FetcherLoader } from "../../components/FetcherLoader/FetcherLoader";
import { FetcherError } from "../../components/FetcherError/FetcherError";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { TTableSession, TTableUsers } from "../../../server/db/schema.db";
import logoSrc from "../../assets/tenbeo-logo.png"
import { tenbeoApplicationSlug } from "../../index";

// Time interval to track login status, in seconds
const trackInterval = 1

interface ILoginProps {
	onLoggedIn?: ( user:TTableUsers ) => any
}

export function LoginPage ( props:ILoginProps ) {
	const { data, isLoading, error, refresh } = useFetcher( authFetchers.create, [tenbeoApplicationSlug] )
	const [ sessionStatus, setSessionStatus ] = useState<TTableSession['status']|"ERROR">("PENDING")
	const isFetching = useRef( false )

	async function trackStatus () {
		if ( isFetching.current )
			return
		isFetching.current = true
		try {
			const result = await authFetchers.track(tenbeoApplicationSlug)
			if ( typeof result === "object" && result.session ) {
				if ( result.session.status === "VALIDATED" )
					props.onLoggedIn( result.user );
				else
					setSessionStatus( result.session.status )
			}
		}
		catch ( error ) {
			console.error( error )
			setSessionStatus("ERROR")
		}
		isFetching.current = false
	}

	// Dispatch successful login if the first retrieve call has found a valid session
	useEffect( () => {
		if ( data && data.session && data.session.status === "VALIDATED" && data.user )
			props.onLoggedIn( data.user );
	}, [ data ] );

	// Start / stop track status loop
	// We start it when a login QR is given by the API
	useLayoutEffect(() => {
		if ( !data || !data.login || sessionStatus !== "PENDING" )
			return
		const intervalID = setInterval( trackStatus, trackInterval * 1000 )
		return () => clearInterval( intervalID )
	}, [ data, sessionStatus ])

	// Revert state of app if an error occurred and user refreshes
	function refreshError () {
		setSessionStatus("PENDING")
		refresh();
	}

	function render () {
		if ( isLoading )
			return null
		else if ( sessionStatus === "PENDING" && data?.login?.qr )
			return <>
				<h3 class={ S._title }>Scan with Tenbeo App to login with your Heart Signature.</h3>
				<img class={ S._qr } src={ data.login.qr }/>
			</>
		else if ( sessionStatus === "EXPIRED" )
			return <FetcherError error={"Session has expired."} refresh={ refreshError } />
		else if ( sessionStatus === "ERROR" || error )
			return <FetcherError error={ error } refresh={ refreshError } />
		else
			return null
	}

	return <div class={ S.LoginPage }>
		<img src={ logoSrc } class={ S._logo }/>
		{ render() ?? <FetcherLoader class={ S._loader }/> }
	</div>
}