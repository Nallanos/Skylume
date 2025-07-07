import { Head, useForm, usePage } from '@inertiajs/react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Checkbox } from '../components/ui/checkbox'

function Login() {
  const { props } = usePage()
  const { data, setData, post, processing } = useForm<{
    email: string
    password: string
    marketing_consent: boolean
  }>({
    email: '',
    password: '',
    marketing_consent: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/login')
  }

  return (
    <>
      <Head title="Login" />
      <div className="flex items-center justify-center min-h-screen w-[80%] container mx-auto">
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
              <p className="text-muted-foreground text-sm">Enter your handle below to login</p>
            </div>

            <div className="grid gap-6">
              <form onSubmit={handleSubmit}>
                {props.errors?.credentials && (
                  <div className="text-red-500 text-sm mb-4">{props.errors.credentials}</div>
                )}

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Bluesky Handle</Label>
                    <Input
                      id="email"
                      placeholder="nallanos.bsky.social"
                      type="text"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      disabled={processing}
                      required
                      value={data.email}
                      onChange={(e) => setData('email', e.target.value)}
                    />
                    {props.errors?.email && (
                      <p className="text-sm text-red-500">{props.errors.email}</p>
                    )}
                  </div>

                  <div className="grid gap-2 pt-2">
                    <Label htmlFor="password">App Password</Label>
                    <Input
                      id="password"
                      placeholder="password"
                      type="password"
                      autoCapitalize="none"
                      autoComplete="current-password"
                      disabled={processing}
                      required
                      value={data.password}
                      onChange={(e) => setData('password', e.target.value)}
                    />
                    {props.errors?.password && (
                      <p className="text-sm text-red-500">{props.errors.password}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="marketing_consent"
                      checked={data.marketing_consent}
                      onCheckedChange={(checked) =>
                        setData('marketing_consent', checked as boolean)
                      }
                    />
                    <Label htmlFor="marketing_consent" className="text-sm">
                      I agree to receive marketing communications
                    </Label>
                  </div>

                  <Button disabled={processing} className="w-full">
                    {processing ? 'Signing in...' : 'Sign In'}
                  </Button>
                </div>
              </form>
            </div>

            <p className="text-muted-foreground px-8 text-center text-sm">
              By clicking continue, you agree to our{' '}
              <a href="/terms" className="hover:text-primary underline underline-offset-4">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="hover:text-primary underline underline-offset-4">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Login
