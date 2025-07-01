import { Head, useForm, usePage } from '@inertiajs/react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Checkbox } from '../components/ui/checkbox'

function Register() {
  const { props } = usePage()
  const { data, setData, post, processing } = useForm<{
    email: string
    password: string
    marketing_consent: boolean
  }>({
    email: '',
    password: '',
    marketing_consent: true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/register')
  }

  return (
    <>
      <Head title="Register" />
      <div className="flex items-center justify-center min-h-screen w-[80%] container mx-auto">
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
              <p className="text-muted-foreground text-sm">
                Enter your details below to create your account
              </p>
            </div>

            <div className="grid gap-6">
              <form onSubmit={handleSubmit}>
                {(props as any).errors?.credentials && (
                  <div className="text-red-500 text-sm mb-4">
                    {(props as any).errors.credentials}
                  </div>
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setData('email', e.target.value)
                      }
                    />
                    {(props as any).errors?.email && (
                      <p className="text-sm text-red-500">{(props as any).errors.email}</p>
                    )}
                  </div>

                  <div className="grid gap-2 pt-2">
                    <Label htmlFor="password">App Password</Label>
                    <Input
                      id="password"
                      placeholder="Create a strong password"
                      type="password"
                      autoCapitalize="none"
                      autoComplete="new-password"
                      disabled={processing}
                      required
                      value={data.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setData('password', e.target.value)
                      }
                    />
                    {(props as any).errors?.password && (
                      <p className="text-sm text-red-500">{(props as any).errors.password}</p>
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
                    {processing ? 'Creating account...' : 'Create Account'}
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

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <a
                  href="/login"
                  className="hover:text-primary underline underline-offset-4 font-medium"
                >
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Register
