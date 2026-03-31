import React from 'react'

interface ModalProps {
    open: boolean
    close: () => void
    children: React.ReactNode
}


export const Modal =({children,open,close}:ModalProps) => {
    if (!open) return null;
    return (
        <div>
            
            {children}
        </div>
    )

}