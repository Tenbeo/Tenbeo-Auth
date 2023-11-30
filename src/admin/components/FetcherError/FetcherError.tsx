import { h } from "preact";
import { AnyHandler } from "@zouloux/ecma-core";


interface IFetcherErrorProps {
	error				?:any
	refresh				?:AnyHandler
}

export function FetcherError ( props:IFetcherErrorProps ) {
	const { error, refresh } = props
	let message = "Unknown error"
	if ( typeof error === "string" )
		message = error
	else if ( error instanceof Error && error.message )
		message = error.message

	return <div>
		<h3>{ message }</h3>
		{ props.refresh && <button onClick={ () => refresh() }>Refresh</button> }
	</div>
}