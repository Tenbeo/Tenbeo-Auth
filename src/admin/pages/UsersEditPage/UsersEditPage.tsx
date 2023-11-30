import { h } from "preact";
import S from "./UsersEditPage.module.less"
import SForms from "../../styles/forms.module.less"
import SPages from "../../styles/pages.module.less"
import { IUserWithSubscribedApps, TTableUsers } from "../../../server/db/schema.db";
import { useFetcher } from "../../utils/hooks.utils";
import { userFetchers } from "../../fetchers/user.fetcher";
import { useEffect, useState } from "preact/hooks";
import { routeTo } from "../../index";
import { route } from "preact-router";
import { FetcherError } from "../../components/FetcherError/FetcherError";
import { FetcherLoader } from "../../components/FetcherLoader/FetcherLoader";
import { ArrowLeftIcon, CheckIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { joinClasses } from "../../utils/preact.utils";
import { ChangeEvent } from "preact/compat";
import { DeepPartial } from "../../utils/types.utils";

interface IUsersEditPageProps {
	path	:string
	userId	?:number
}

export function UsersEditPage ( props:IUsersEditPageProps ) {
	const { userId } = props
	const isCreate = !userId
	const previousRoute = routeTo(`/users/`)

	const { isLoading, error, data } = useFetcher( userFetchers.get, [ userId ?? "new" ] )

	const [ isBusy, setIsBusy ] = useState( false )

	async function onFormSubmit ( event:Event ) {
		event.preventDefault()
		if ( isBusy )
			return
		setIsBusy( true )
		const user:DeepPartial<IUserWithSubscribedApps> = {
			// Copy app subscriptions and pass every subscription to false
			// The formData will re-enable those with the checkbox ticked
			appsSubscriptions: [
				...data.appsSubscriptions.map( sub => ({
					id: sub.id,
					subscribes: false
				}))
			]
		}
		// Copy all data from FormData to the user object
		const formData = new FormData( event.currentTarget as HTMLFormElement )
		formData.forEach( (value, key) => {
			// We detected an app subscription checkbox
			if ( key.indexOf("subscription_") === 0 ) {
				const appSub = user.appsSubscriptions.find( a => a.id == parseFloat(value as string) )
				appSub.subscribes = true
			}
			// Raw user property
			else
				user[ key ] = value
		})
		// Fetch create or update request
		try {
			if ( isCreate )
				await userFetchers.create( user as TTableUsers )
			else
				await userFetchers.update( userId, user as TTableUsers )
			route( previousRoute )
		}
		catch ( error ) {
			console.error( error )
			alert(`Unable to save user.`)
		}
		setIsBusy( false )
	}

	const [ isDataJsonInvalid, setIsDataJsonInvalid ] = useState( false )
	useEffect(() => { data && checkJsonDataSyntax(data.data ?? "") }, [data])
	function checkJsonDataSyntax ( value:string ) {
		if ( !value )
			return true
		try {
			JSON.parse( value )
			return true
		}
		catch ( error ) {
			//console.error( error )
			return false
		}
	}
	function jsonDataFieldChanged ( event:ChangeEvent<HTMLTextAreaElement> ) {
		const { value } = event.currentTarget
		const isValid = checkJsonDataSyntax( value )
		setIsDataJsonInvalid( !isValid )
	}


	let component
	if ( isLoading )
		component = <FetcherLoader />
	else if ( error )
		component = <FetcherError error={ error } />
	else
		component = <form
			className={ SForms.Form }
			onSubmit={ onFormSubmit }
		>
			<label className={ SForms.Form_input }>
				<span>Name *</span>
				<input name="name" defaultValue={ data.name } required />
			</label>
			<br />
			<label className={ SForms.Form_input }>
				<span>Public key *</span>
				<textarea
					name="publicKey" defaultValue={ data.publicKey } required
					rows={2}
				/>
			</label>
			<br />
			<label className={ SForms.Form_input }>
				<span>E-mail address</span>
				<input type="email" name="email" defaultValue={ data.email } />
			</label>
			<br />
			<label className={joinClasses(SForms.Form_input, isDataJsonInvalid && SForms.Form_input__warning)}>
				<span>Json Data</span>
				{ isDataJsonInvalid && <span><CrossCircledIcon />Invalid JSON</span>}
				<textarea
					name="data" defaultValue={ data.data }
					rows={10}
					onChange={ jsonDataFieldChanged }
				/>
			</label>
			<br />
			<div className={joinClasses(SForms.Form_separator, S._apps)}>
				<h3>Subscribed applications</h3>
				<div className={ S._appsList }>
					{data.appsSubscriptions.map( app =>
						<label className={ S._appItem } key={ app.id }>
							<input
								type="checkbox"
								defaultChecked={ app.subscribes }
								name={`subscription_${app.id}`}
								value={ app.id }
							/>
							<span>{ app.slug }</span>
						</label>
					)}
				</div>
			</div>
			<div className={ SForms.Form_actions }>
				<button
					type="submit"
					className={ joinClasses(SForms.Button, SForms.Button__positive) }
				>
					<CheckIcon />
					<span>Save</span>
				</button>
			</div>
		</form>

	return <div class={ S.UserEditPage }>
		<div class={ SPages._header }>
			<a
				href={ previousRoute }
				class={ SForms.Button }
			>
				<ArrowLeftIcon />
				<span>Back</span>
			</a>
			<h2>{ isCreate ? "Create new" : "Edit" } user { !isCreate && data?.name }</h2>
		</div>
		{ component }
	</div>
}