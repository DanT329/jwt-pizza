import { test, expect } from 'playwright-test-coverage';

//TODO: Refactor all these tests. Make helper methods for all routes.

test('home page', async ({ page }) => {
  await page.goto('/');

  expect(await page.title()).toBe('JWT Pizza');
});

test('purchase with login', async ({ page }) => {
    await page.route('*/**/api/order/menu', async (route) => {
      const menuRes = [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
        { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
      ];
      expect(route.request().method()).toBe('GET');
      await route.fulfill({ json: menuRes });
    });
  
    await page.route('*/**/api/franchise', async (route) => {
      const franchiseRes = [
        {
          id: 2,
          name: 'LotaPizza',
          stores: [
            { id: 4, name: 'Lehi' },
            { id: 5, name: 'Springville' },
            { id: 6, name: 'American Fork' },
          ],
        },
        { id: 3, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork' }] },
        { id: 4, name: 'topSpot', stores: [] },
      ];
      expect(route.request().method()).toBe('GET');
      await route.fulfill({ json: franchiseRes });
    });
  
    await page.route('*/**/api/auth', async (route) => {
      const loginReq = { email: 'd@jwt.com', password: 'a' };
      const loginRes = { user: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, token: 'abcdef' };
      expect(route.request().method()).toBe('PUT');
      expect(route.request().postDataJSON()).toMatchObject(loginReq);
      await route.fulfill({ json: loginRes });
    });
  
    await page.route('*/**/api/order', async (route) => {
      const orderReq = {
        items: [
          { menuId: 1, description: 'Veggie', price: 0.0038 },
          { menuId: 2, description: 'Pepperoni', price: 0.0042 },
        ],
        storeId: '4',
        franchiseId: 2,
      };
      const orderRes = {
        order: {
          items: [
            { menuId: 1, description: 'Veggie', price: 0.0038 },
            { menuId: 2, description: 'Pepperoni', price: 0.0042 },
          ],
          storeId: '4',
          franchiseId: 2,
          id: 23,
        },
        jwt: 'eyJpYXQ',
      };
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toMatchObject(orderReq);
      await route.fulfill({ json: orderRes });
    });
  
    await page.goto('/');
  
    // Go to order page
    await page.getByRole('button', { name: 'Order now' }).click();
  
    // Create order
    await expect(page.locator('h2')).toContainText('Awesome is a click away');
    await page.getByRole('combobox').selectOption('4');
    await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
    await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
    await expect(page.locator('form')).toContainText('Selected pizzas: 2');
    await page.getByRole('button', { name: 'Checkout' }).click();
  
    // Login
    await page.getByPlaceholder('Email address').click();
    await page.getByPlaceholder('Email address').fill('d@jwt.com');
    await page.getByPlaceholder('Email address').press('Tab');
    await page.getByPlaceholder('Password').fill('a');
    await page.getByRole('button', { name: 'Login' }).click();
  
    // Pay
    await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
    await expect(page.locator('tbody')).toContainText('Veggie');
    await expect(page.locator('tbody')).toContainText('Pepperoni');
    await expect(page.locator('tfoot')).toContainText('0.008 ₿');
    await page.getByRole('button', { name: 'Pay now' }).click();
  
    // Check balance
    await expect(page.getByText('0.008')).toBeVisible();
  });

  test('register user', async ({ page }) => {
    // Intercept the POST request to the registration endpoint
    await page.route('https://pizza-service.cs329.click/api/auth', async (route) => {
      const requestBody = await route.request().postDataJSON();
  
      // Verify the request body
      expect(requestBody).toEqual({
        name: 'TestUser',
        email: 'TestUserEmail@jwt.com',
        password: 'password',
      });
  
      // Mock a successful response
      const mockResponse = {
        user: {
          id: 1,
          name: 'TestUser',
          email: 'TestUserEmail@jwt.com',
          roles: [{ role: 'user' }],
        },
        token: 'mocked-jwt-token',
      };
  
      // Fulfill the request with the mock response
      await route.fulfill({
        status: 201, // or 200 if you prefer
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      });
    });
  
    // Navigate to the application
    await page.goto('/');
  
    // Perform registration steps
    await page.getByRole('link', { name: 'Register' }).click();
    await expect(page.getByRole('heading')).toContainText('Welcome to the party');
    await page.getByPlaceholder('Full name').click();
    await page.getByPlaceholder('Full name').fill('TestUser');
    await page.getByPlaceholder('Email address').click();
    await page.getByPlaceholder('Email address').fill('TestUserEmail@jwt.com');
    await page.getByPlaceholder('Password').click();
    await page.getByPlaceholder('Password').fill('password');
    await page.getByRole('button', { name: 'Register' }).click();
   
  });


  test('logout', async ({ page }) => {
    await page.route('*/**/api/auth', async (route) => {
      const loginReq = { email: 'd@jwt.com', password: 'a' };
      const loginRes = { user: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, token: 'abcdef' };
        if (route.request().method() === 'PUT') {
            expect(route.request().method()).toBe('PUT');
            expect(route.request().postDataJSON()).toMatchObject(loginReq);
            await route.fulfill({ json: loginRes });
        }
        else if (route.request().method() === 'DELETE') {
            const logoutRes = { message: 'logout successful' };
            expect(route.request().method()).toBe('DELETE');
            await route.fulfill({ json: logoutRes });
        }

    });
    await page.goto('/');
    await expect(page.locator('#navbar-dark')).toContainText('Login');
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('d@jwt.com');
    await page.getByPlaceholder('Password').click();
    await page.getByPlaceholder('Password').fill('a');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.locator('#navbar-dark')).toContainText('Logout');
    await page.getByRole('link', { name: 'Logout' }).click();
});


test('test nav bar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Global').getByRole('link', { name: 'Franchise' })).toBeVisible();
  await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
  await expect(page.getByRole('main')).toContainText('So you want a piece of the pie?');
  await expect(page.getByRole('link', { name: 'franchise-dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'home' })).toBeVisible();
  await expect(page.locator('div').filter({ hasText: /^If you are already a franchisee, pleaseloginusing your franchise account$/ }).nth(2)).toBeVisible();
  await page.getByRole('link', { name: 'Order' }).click();
  await page.getByText('JWT Pizza', { exact: true }).click();
  await page.getByLabel('Global').getByRole('img').click();
  await page.getByRole('link', { name: 'home' }).click();
});

test('special franchise screen', async ({ page }) => {
  await page.route('*/**/api/auth', async (route) => {
      const loginReq = { email: 'j@jwt.com', password: 'a' };
      const loginRes = { user: { id: 3, name: 'Kai Chen', email: 'j@jwt.com', roles: [{ role: 'franchisee' }] } };
      expect(route.request().method()).toBe('PUT');
      expect(route.request().postDataJSON()).toMatchObject(loginReq);
      await route.fulfill({ json: loginRes });
  });

  await page.goto('http://localhost:5173/');
  await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
  await page.getByRole('link', { name: 'login', exact: true }).click();
  await page.getByPlaceholder('Email address').click();
  await page.getByPlaceholder('Email address').fill('j@jwt.com');
  await page.getByPlaceholder('Password').click();
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

});




test('create store as franchise person', async ({ page }) => {
  await page.route('*/**/api/auth', async (route) => {
    const loginReq = { email: 'testUser@jwt.com', password: 'a' };
    const loginResp = { user: { id: 1, name: 'Dan', email: 'testUser@jwt.com', roles: [{ role: 'franchisee' }] } };
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginResp });
  });

  await page.route('*/**/api/franchise/*', async (route) => {
    const franchiseRes = [
      {
        id: 4,
        name: 'TestPizza',
        admins: [{ id: 1, name: 'Dan', email: 'testUser@jwt.com' }],
        stores: [{ id: 2, name: 'Provo', totalRevenue: 0.000 }],
      },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
  });

  await page.route('*/**/api/franchise/4/store', async (route) => {
    const storeReq = { name: 'TestName' };
    const storeRes = [{ id: 3, franchiseId: 4, name: 'TestName' }];
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject(storeReq);
    await route.fulfill({ json: storeRes });
  });

  await page.goto('/');
  await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
  await page.getByRole('link', { name: 'login', exact: true }).click();
  await page.getByPlaceholder('Email address').fill('testUser@jwt.com');
  await page.getByPlaceholder('Password').click();
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  
  await page.getByRole('button', { name: 'Create store' }).click();
  await expect(page.getByRole('heading')).toContainText('Create store');
  await page.getByPlaceholder('store name').click();
  await page.getByPlaceholder('store name').fill('TestName');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('cell', { name: 'Provo' })).toBeVisible();
});


test('delete store as franchise person', async ({ page }) => {
  await page.route('*/**/api/auth', async (route) => {
    const loginReq = { email: 'testUser@jwt.com', password: 'a' };
    const loginResp = { user: { id: 1, name: 'Dan', email: 'testUser@jwt.com', roles: [{ role: 'franchisee' }] } };
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginResp });
  });

  await page.route('*/**/api/franchise/*', async (route) => {
    const franchiseRes = [
      {
        id: 4,
        name: 'TestPizza',
        admins: [{ id: 1, name: 'Dan', email: 'testUser@jwt.com' }],
        stores: [{ id: 2, name: 'Provo', totalRevenue: 0.000 }],
      },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
  });

  await page.route('*/**/api/franchise/4/store/2', async (route) => {
    const storeRes = { message: 'store deleted' };
    expect(route.request().method()).toBe('DELETE');
    await route.fulfill({ json: storeRes });
  });

  await page.goto('/');
  await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
  await page.getByRole('link', { name: 'login', exact: true }).click();
  await page.getByPlaceholder('Email address').fill('testUser@jwt.com');
  await page.getByPlaceholder('Password').click();
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('cell', { name: 'Provo' })).toBeVisible();
  await page.getByRole('row', { name: 'Provo 0 ₿ Close' }).getByRole('button').click();
  await expect(page.getByRole('heading')).toContainText('Sorry to see you go');
  await page.getByRole('button', { name: 'Close' }).click();
});


test('check diner dashboard', async ({ page }) => {
  // Mock authentication API route
  await page.route('*/**/api/auth', async (route) => {
    const loginReq = { email: 'd@jwt.com', password: 'a' };
    const loginResp = { user: { id: 1, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] } };
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginResp });
  });

  // Mock order API route
  await page.route('*/**/api/order', async (route) => {
    const orderResp = {
      dinerId: 3,
      orders: [
        {
          id: 2,
          franchiseId: 1,
          storeId: 2,
          date: '2024-05-07T20:21:27.000Z',
          items: [
            { id: 3, menuId: 2, description: 'Pepperoni', price: 0.005 },
            { id: 4, menuId: 4, description: 'Crusty', price: 0.0045 }
          ]
        },
        {
          id: 7,
          franchiseId: 2,
          storeId: 4,
          date: '2024-05-08T03:50:22.000Z',
          items: [
            { id: 23, menuId: 2, description: 'Pepperoni', price: 0.0042 },
            { id: 24, menuId: 2, description: 'Pepperoni', price: 0.0042 },
            { id: 25, menuId: 2, description: 'Pepperoni', price: 0.0042 },
            { id: 26, menuId: 2, description: 'Pepperoni', price: 0.0042 }
          ]
        }
      ]
    };
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: orderResp });
  });

  // Navigate and perform actions on the page
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Email address').press('Tab');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  // Verify login and diner dashboard
  await expect(page.getByLabel('Global')).toContainText('KC');
  await page.getByRole('link', { name: 'KC' }).click();
  await expect(page.getByRole('heading')).toContainText('Your pizza kitchen');
  await expect(page.getByRole('img', { name: 'Employee stock photo' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Kai Chen');
  await expect(page.getByRole('main')).toContainText('d@jwt.com');
  await expect(page.getByRole('main')).toContainText('diner');
  await expect(page.getByRole('main')).toContainText('Here is your history of all the good times.');

  // Verify order details in the table
  await expect(page.locator('tbody')).toContainText('2');
  await expect(page.locator('tbody')).toContainText('0.01 ₿'); // Sum of order prices
  await expect(page.locator('tbody')).toContainText('2024-05-07T20:21:27.000Z');
});


test('about page', async ({ page }) => {
  await page.goto('http://localhost:5173/about');
  await expect(page.getByRole('main')).toContainText('The secret sauce');
  await expect(page.locator('div').filter({ hasText: /^Brian$/ }).getByRole('img')).toBeVisible();
  await expect(page.locator('div').filter({ hasText: /^Anna$/ }).getByRole('img')).toBeVisible();
  await expect(page.locator('div').filter({ hasText: /^Maria$/ }).getByRole('img')).toBeVisible();
  await expect(page.locator('div').filter({ hasText: /^James$/ }).getByRole('img')).toBeVisible();
});

test('history page', async ({ page }) => {
  await page.goto('/history');
  await expect(page.getByRole('heading')).toContainText('Mama Rucci, my my');
});

test('not found page', async ({ page }) => {
  await page.goto('/notfound');
  await expect(page.getByRole('heading')).toContainText('Oops');
  await expect(page.getByRole('main')).toContainText('It looks like we have dropped a pizza on the floor. Please try another page.');

});

test('access admin login', async ({ page }) => {
  await page.route('*/**/api/auth', async (route) => {
    const loginReq = { email: 'd@jwt.com', password: 'a' };
    const loginResp = { user: { id: 1, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'admin' }] } };
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginResp });
  });

  await page.route('*/**/api/franchise/*', async (route) => {
    const franchiseAdmin = [
      {
        id: 1,
        name: 'TestFranchise',
        admins: [
          {
            id: 1,
            name: 'Kai Chen',
            email: 'd@jwt.com'
          }
        ],
        stores: []
      }
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseAdmin });
  });
  
  await page.goto('/');

  // Login
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Email address').press('Tab');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByPlaceholder('Password').press('Enter');
  await page.getByRole('link', { name: 'Admin' }).click();


  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByPlaceholder('franchise name').click();
  await page.getByPlaceholder('franchise name').fill('TestFranchise');
  await page.getByPlaceholder('franchisee admin email').click();
  await page.getByPlaceholder('franchisee admin email').fill('d@jwt.com');
  await page.getByRole('button', { name: 'Create' }).click();
});


test('login fail', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Email address').fill('fakeUser@email.com');
  await page.getByPlaceholder('Email address').press('Tab');
  await page.getByPlaceholder('Password').fill('fake');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('main')).toContainText('{"code":500,"message":"Failed to fetch"}');
});


test('purchase fail due to unauthorized order', async ({ page }) => {
  await page.route('*/**/api/order/menu', async (route) => {
    const menuRes = [
      { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: menuRes });
  });

  await page.route('*/**/api/franchise', async (route) => {
    const franchiseRes = [
      {
        id: 2,
        name: 'LotaPizza',
        stores: [
          { id: 4, name: 'Lehi' },
          { id: 5, name: 'Springville' },
          { id: 6, name: 'American Fork' },
        ],
      },
      { id: 3, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork' }] },
      { id: 4, name: 'topSpot', stores: [] },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
  });

  await page.route('*/**/api/auth', async (route) => {
    const loginReq = { email: 'd@jwt.com', password: 'a' };
    const loginRes = { user: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, token: 'abcdef' };
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.route('*/**/api/order', async (route) => {
    const orderReq = {
      items: [
        { menuId: 1, description: 'Veggie', price: 0.0038 },
        { menuId: 2, description: 'Pepperoni', price: 0.0042 },
      ],
      storeId: '4',
      franchiseId: 2,
    };
    const errorRes = { message: 'Sad...no pizza for you.' };  
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject(orderReq);
    await route.fulfill({
      status: 401,
      json: errorRes,
    });
  });

  await page.goto('/');

  // Go to order page
  await page.getByRole('button', { name: 'Order now' }).click();

  // Create order
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();

  // Login
  await page.getByPlaceholder('Email address').click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Email address').press('Tab');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  // Attempt payment and expect failure message
  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');
  await page.getByRole('button', { name: 'Pay now' }).click();

  // Expect error message due to failure
  await expect(page.getByText('Sad...no pizza for you.')).toBeVisible();  // Check that the error message is shown
});
