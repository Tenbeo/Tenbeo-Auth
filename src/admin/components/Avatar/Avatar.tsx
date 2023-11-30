import S from "./Avatar.module.less"
import { h } from "preact"
import { useEffect, useRef } from "preact/hooks";
import { loadGravatarFromUserEmail } from "../../utils/gravatar.utils";


interface IAvatarProps {
	email?:string
}

function placeHolder () {
	return <svg className={ S._placeholder } viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M24 25C26.7614 25 29 22.7614 29 20C29 17.2386 26.7614 15 24 15C21.2386 15 19 17.2386 19 20C19 22.7614 21.2386 25 24 25Z" />
		<path d="M32 34C32 30.6829 28.4144 28 24 28C19.5856 28 16 30.6829 16 34" />
	</svg>
}

export function Avatar ( props:IAvatarProps ) {

	const $root = useRef<HTMLDivElement>()

	useEffect(() => {
		if ( !props.email )
			return
		loadGravatarFromUserEmail( props.email ).then( img => {
			img.classList.add( S._image )
			$root.current.append( img )
		})
	}, [props.email])

	return <div class={ S.Avatar } ref={ $root }>
		{ placeHolder() }
	</div>
}