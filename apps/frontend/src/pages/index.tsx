import {Link} from "@tanstack/react-router";
import {Button} from "@/components/ui/button.tsx";

export const IndexPage = () => {
    return (
        <div className='sticky top-0 w-full bg-background border-b py-3 px-1'>
            <Link to='/load'>
                <Button variant='ghost'>Load</Button>
            </Link>
        </div>
    )
}