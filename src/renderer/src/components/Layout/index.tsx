import React, { ReactNode, useCallback, useState } from 'react';
import { FolderAddOutlined, FolderOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Layout, Menu } from 'antd';

import './index.css';

const { Content, Sider } = Layout;

type Props = {
    children: ReactNode;
}

const RevenoteLayout = ({ children }: Props) => {

    const [collapsed, setCollapsed] = useState(false);

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
                    theme='light'
                    trigger={null}
                    collapsed={collapsed}
                    onBreakpoint={(broken) => {
                        console.log(broken);
                    }}
                    onCollapse={(collapsed, type) => {
                        console.log(collapsed, type);
                    }}
                >
                    <div className='revenote-topleft-toolbar'>
                        <span className='tool-buttons'>
                            <FolderAddOutlined />
                            <MenuFoldOutlined onClick={switchCollapse} />
                        </span>
                    </div>
                    <Menu
                        theme="light"
                        mode="vertical"
                        defaultSelectedKeys={['4']}
                        items={[1, 2, 3, 4].map(
                            (icon, index) => ({
                                key: String(index + 1),
                                icon: <FolderOutlined />,
                                label: `nav ${index + 1}`,
                            }),
                        )}
                    />
                </Sider>
                <Layout>
                    <Content>
                        {collapsed && <MenuUnfoldOutlined onClick={switchCollapse} className='uncollapse-icon' />}
                        {children}
                    </Content>
                </Layout>
            </Layout>
        </div>
    );
};

export default RevenoteLayout;