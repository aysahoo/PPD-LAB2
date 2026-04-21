import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Anchor, Button, Card, Stack, Text, TextInput } from '@mantine/core'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { PageShellCentered } from '@/lib/layout'
import { useAuth } from '@/contexts/auth-context'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, user } = useAuth()

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/account'

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await login(data.email, data.password)
      navigate(from, { replace: true })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Login failed'
      setError('root', { message })
    }
  })

  if (user) {
    return <Navigate to={from} replace />
  }

  return (
    <PageShellCentered>
      <Card withBorder shadow="sm" padding="lg" radius="md" w="100%">
        <Stack gap="xs" mb="md">
          <Text size="xl" fw={600}>
            Sign in
          </Text>
          <Text size="sm" c="dimmed">
            Use your student account to continue.
          </Text>
        </Stack>
        <form onSubmit={onSubmit}>
          <Stack gap="md">
            <TextInput
              label="Email"
              id="email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <TextInput
              label="Password"
              id="password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            {errors.root ? (
              <Text size="sm" c="red" role="alert">
                {errors.root.message}
              </Text>
            ) : null}
            <Button type="submit" fullWidth loading={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </form>
        <Text size="sm" c="dimmed" ta="center" mt="md">
          No account?{' '}
          <Anchor component={Link} to="/register" size="sm">
            Register
          </Anchor>
        </Text>
      </Card>
    </PageShellCentered>
  )
}
