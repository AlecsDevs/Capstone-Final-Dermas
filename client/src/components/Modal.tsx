import type { ReactNode } from 'react'

interface ModalProps {
    open: boolean
    close: () => void
    children: ReactNode
}


export const Modal =({children,open,close: _close}:ModalProps) => {
    if (!open) return null;
    void _close
    return (
        <div>
            
            {children}
        </div>
    )

}