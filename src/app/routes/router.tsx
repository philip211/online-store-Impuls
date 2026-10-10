import { createBrowserRouter } from 'react-router'

import { NotFoundPage } from '@/pages/not-found'
import { preloadHeroImage } from '@/entities/product'

import { RootLayout } from '../layouts/RootLayout'
import { PageFallback } from '../layouts/PageFallback'
import { RequireAdmin, RequireStaff, RequireUser } from './guards'
import { RouteError } from './RouteError'

/** Every page is code-split; loaders prefetch data in parallel with the chunk. */
export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    HydrateFallback: PageFallback,
    children: [
      {
        ErrorBoundary: RouteError,
        children: [
          {
            index: true,
            lazy: async () => {
              // The hero photo starts now, alongside the page chunk and the loader's API calls.
              preloadHeroImage()
              const { HomePage, homeLoader } = await import('@/pages/home')
              return { Component: HomePage, loader: homeLoader }
            },
          },
          {
            path: 'catalog',
            lazy: async () => ({ Component: (await import('@/pages/catalog')).CatalogPage }),
          },
          {
            path: 'product/:slug',
            lazy: async () => {
              const { ProductPage, productLoader } = await import('@/pages/product')
              return { Component: ProductPage, loader: productLoader }
            },
          },
          {
            path: 'cart',
            lazy: async () => ({ Component: (await import('@/pages/cart')).CartPage }),
          },
          {
            path: 'favorites',
            lazy: async () => ({ Component: (await import('@/pages/favorites')).FavoritesPage }),
          },
          {
            path: 'help/:topic?',
            lazy: async () => ({ Component: (await import('@/pages/help')).HelpPage }),
          },
          {
            path: 'finder',
            lazy: async () => ({ Component: (await import('@/pages/finder')).FinderPage }),
          },
          {
            path: 'order/success',
            lazy: async () => ({
              Component: (await import('@/pages/order-success')).OrderSuccessPage,
            }),
          },
          {
            path: 'login',
            lazy: async () => ({ Component: (await import('@/pages/login')).LoginPage }),
          },
          {
            // Personal area: signed-in visitors only.
            Component: RequireUser,
            children: [
              {
                path: 'account',
                lazy: async () => ({ Component: (await import('@/pages/account')).AccountLayout }),
                children: [
                  {
                    index: true,
                    lazy: async () => ({
                      Component: (await import('@/pages/account')).AccountOrdersPage,
                    }),
                  },
                  {
                    path: 'orders/:number',
                    lazy: async () => ({
                      Component: (await import('@/pages/account')).AccountOrderPage,
                    }),
                  },
                  {
                    path: 'settings',
                    lazy: async () => ({
                      Component: (await import('@/pages/account')).AccountSettingsPage,
                    }),
                  },
                ],
              },
            ],
          },
          {
            // Staff area, a separate chunk the storefront never downloads.
            Component: RequireStaff,
            children: [
              {
                path: 'admin',
                lazy: async () => ({ Component: (await import('@/pages/admin')).AdminLayout }),
                children: [
                  {
                    index: true,
                    lazy: async () => ({
                      Component: (await import('@/pages/admin')).AdminDashboardPage,
                    }),
                  },
                  {
                    path: 'orders',
                    lazy: async () => ({
                      Component: (await import('@/pages/admin')).AdminOrdersPage,
                    }),
                  },
                  {
                    path: 'orders/:number',
                    lazy: async () => ({
                      Component: (await import('@/pages/admin')).AdminOrderPage,
                    }),
                  },
                  {
                    path: 'products',
                    lazy: async () => ({
                      Component: (await import('@/pages/admin')).AdminProductsPage,
                    }),
                  },
                  {
                    // Declared before :id so 'new' is never read as a product id.
                    path: 'products/new',
                    lazy: async () => ({
                      Component: (await import('@/pages/admin')).AdminProductNewPage,
                    }),
                  },
                  {
                    path: 'products/:id',
                    lazy: async () => ({
                      Component: (await import('@/pages/admin')).AdminProductPage,
                    }),
                  },
                  {
                    path: 'reviews',
                    lazy: async () => ({
                      Component: (await import('@/pages/admin')).AdminReviewsPage,
                    }),
                  },
                  {
                    path: 'returns',
                    lazy: async () => ({
                      Component: (await import('@/pages/admin')).AdminReturnsPage,
                    }),
                  },
                  {
                    Component: RequireAdmin,
                    children: [
                      {
                        path: 'users',
                        lazy: async () => ({
                          Component: (await import('@/pages/admin')).AdminUsersPage,
                        }),
                      },
                      {
                        path: 'audit',
                        lazy: async () => ({
                          Component: (await import('@/pages/admin')).AdminAuditPage,
                        }),
                      },
                    ],
                  },
                ],
              },
            ],
          },
          { path: '*', Component: NotFoundPage },
        ],
      },
    ],
  },
])
