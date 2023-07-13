import { ReactNode, useCallback, useState } from 'react';
import { Layout, Menu } from 'antd';
import { FolderIcon, FolderPlusIcon, ArrowLeftOnRectangleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { SiderTheme } from 'antd/es/layout/Sider';

import './index.css';

const { Content, Sider } = Layout;

type Props = {
    children: ReactNode;
}

const RevenoteLayout = ({ children }: Props) => {

    const [collapsed, setCollapsed] = useState(false);
    const [theme, setTheme] = useState<SiderTheme>('light');

    const switchCollapse = useCallback(() => {
        setCollapsed(!collapsed);
        window.api.toggleTrafficLight(collapsed);
    }, [collapsed]);

    return (
        <div className="revenote-layout">
            <Layout>
                <Sider
                    breakpoint="lg"
                    collapsedWidth="0"
                    theme={theme}
                    trigger={null}
                    collapsed={collapsed}
                    width={260}
                    onBreakpoint={(broken) => {
                        console.log(broken);
                    }}
                    onCollapse={(collapsed, type) => {
                        console.log(collapsed, type);
                    }}
                >
                    <div className='revenote-topleft-toolbar'>
                        <span className='tool-buttons'>
                            <FolderPlusIcon className='h-5 w-5 text-current cursor-pointer mr-5' />
                            <ArrowLeftOnRectangleIcon className='h-5 w-5 text-current cursor-pointer'
                                onClick={switchCollapse} />
                        </span>
                    </div>
                    <Menu
                        theme="light"
                        mode="vertical"
                        defaultSelectedKeys={['4']}
                        style={{ border: 'none' }}
                        items={[1, 2, 3, 4].map(
                            (icon, index) => ({
                                key: String(index + 1),
                                icon: <FolderIcon className='h-4 w-4' />,
                                label: `nav ${index + 1}`,
                            }),
                        )}
                    />
                </Sider>
                <Layout>
                    <Content className='font-sans'>
                        {collapsed && <ArrowRightOnRectangleIcon onClick={switchCollapse} className='h-5 w-5 text-current cursor-pointer mt-3 ml-5 absolute z-50' />}
                        {children}
                    </Content>
                </Layout>
            </Layout>
        </div>
    );
};

export default RevenoteLayout;