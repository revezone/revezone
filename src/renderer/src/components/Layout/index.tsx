import React, { ReactNode } from 'react';
import { FolderAddOutlined, FolderOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { Layout, Menu } from 'antd';

import './index.css';

const { Content, Sider } = Layout;

type Props = {
    children: ReactNode;
}


const RevenoteLayout = ({ children }: Props) => {

    return (
        <div className="revenote-layout">
            <Layout>
                <Sider
                    breakpoint="lg"
                    collapsedWidth="0"
                    theme='light'
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
                            <MenuFoldOutlined />
                        </span>
                    </div>
                    <Menu
                        theme="light"
                        mode="inline"
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
                        {children}
                    </Content>
                </Layout>
            </Layout>
        </div>
    );
};

export default RevenoteLayout;