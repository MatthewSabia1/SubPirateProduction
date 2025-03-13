import { ComponentType, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FeatureKey } from './features'
import { useFeatureAccess } from '../../contexts/FeatureAccessContext'

export function withFeatureAccess<P extends object>(
  WrappedComponent: ComponentType<P>,
  requiredFeature: FeatureKey,
  redirectPath: string = '/pricing'
) {
  return function WithFeatureAccessWrapper(props: P) {
    const navigate = useNavigate()
    const { hasAccess, isLoading } = useFeatureAccess()
    const [accessChecked, setAccessChecked] = useState(false)

    useEffect(() => {
      if (!isLoading) {
        const canAccess = hasAccess(requiredFeature)
        setAccessChecked(true)
        
        if (!canAccess) {
          navigate(redirectPath)
        }
      }
    }, [hasAccess, isLoading, navigate, redirectPath, requiredFeature])

    // Show nothing while checking access
    if (isLoading || !accessChecked) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-pulse text-gray-400">Checking access...</div>
        </div>
      )
    }

    // Only render the component if user has access
    return hasAccess(requiredFeature) ? <WrappedComponent {...props} /> : null
  }
} 